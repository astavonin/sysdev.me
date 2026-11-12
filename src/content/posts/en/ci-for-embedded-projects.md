---
title: "CI for Embedded Projects"
description: "Why embedded CI is usually bad, and the pipeline that answers every excuse for it: one pinned toolchain image for the laptop and the runner, every compiled test run under sanitizers, and real boards wired into the pipeline."
date: 2026-11-12
slug: "ci-for-embedded-projects"
lang: en
category: tooling
tags: ["CI", "DevOps", "Embedded", "GitLab"]
cover: "/img/ci-for-embedded-projects/konorchek-canyons.jpg"
featured: false
---

<figure style="float: left; width: 300px; margin: 0 1em 1em 0;">
  <a href="/img/ci-for-embedded-projects/konorchek-canyons.jpg" target="_blank">
    <img src="/img/ci-for-embedded-projects/konorchek-canyons.jpg" alt="" width="250">
  </a>
  <figcaption>
    Konorchek canyons. One way in, one way out, and the walls do the gatekeeping. Nobody asks the canyon for an exception.
  </figcaption>
</figure>

In embedded, CI is usually crap. I've seen the same picture at more places than I'd like: firmware gets built on one engineer's machine (the one with the SDK someone installed three years ago and nobody dares to touch), it travels to a board over scp or a USB stick, and then a human pokes at the device for twenty minutes and says "looks fine". Sometimes there's a Jenkins job that compiles something. Almost never does anything run on real hardware without a person sitting next to it.

The excuses barely change from team to team. Cross-compiling is hard, so we build on the device. Compiling on an ARM board, seriously? It's not rocket science, it's a container with an SDK inside. On-device tests can't be automated because the board is special, the setup is fragile, the flashing is manual. I don't buy any of it.

On my current project the goal was simple. A build on my laptop and a build in CI come out of the same pinned toolchain image, through the same scripts, with the same flags. CI does the full verification: unit tests, integration tests, and end-to-end tests on real target boards. And nobody merges on a red pipeline.

This post walks through the approach. First the shape of the fix, then every stage in the order a commit hits it: the toolchain pin, the local/CI parity story (including where it cracks), lint, sanitizers, test selection, the board in the loop, and the alert that fires when master breaks. The examples are GitLab CI, but very little of the design depends on GitLab, and almost nothing depends on the build tool: CI and the laptop both call the same build entrypoint, and what matters is the SDK, the sysroot and the flags behind it.

## The Shape of the Fix

Before any YAML, the rules. Everything below is just these five turned into jobs.

1. **One build environment, pinned.** The same container image runs the command on a laptop and on a runner. If a developer can't reproduce a CI build with one command, the CI result is somebody else's problem, and that's exactly how "works on my machine" ends up in production.
2. **Cheap checks first.** The board only sees what already passed them, and publishing comes last.
3. **C++ gets no benefit of the doubt.** I used to think Rust or Zig would eat systems work, but LLMs changed the math for C++: writing a test is now cheap, and a test under a sanitizer catches the UB, the races and the memory errors that make C++ scary in the first place. So every compiled test binary runs three times, once plain and twice under sanitizers.
4. **Narrow on merge requests, everything on master.** A merge request runs only the tests its diff can reach. Master runs the whole suite, so if the selector misses something, the cost is a late red and not an escaped bug.
5. **Red blocks the merge, and a red master is loud.** One deliberate exception (the hardware job on merge requests, more on it later). A failure on master goes to the team chat, because a broken default branch that nobody hears about stays broken.

## The Pipeline at a Glance

The stage order is the whole trust model, so it's worth seeing before the details. Six stages, and everything inside a stage runs in parallel:

<img src="/img/ci-for-embedded-projects/pipeline-stages.svg" width="1024" alt="">

`prepare` prefetches upstream artifacts: inputs that another CI pipeline built and published to a registry. Anything that isn't a container image fits here, whether it's a model, a prebuilt vendor library, a calibration bundle or a firmware blob from another repo. Pin the version in a committed manifest, fetch it once per pipeline, and hand it on as a short-lived job artifact.

`build` runs two jobs side by side: an x86_64 release build for the host-side tests, and the target package from the target SDK image. `validate` is where most of the time goes, with the three compiled-test configurations, the integration tests and lint all running in parallel. `e2e` sits after it, so a board only ever sees a package that already passed the cheap checks, and `publish` waits for the board. GitLab starts a stage only after the previous one succeeds, so the ordering is free, with one catch: a job with `needs:` ignores stages and starts the moment the jobs it names finish[^needs]. Give the board job `needs: [build-cross-compile]` to grab the package early and it will happily race the tests. Either let the stage order do the waiting, or list the `validate` jobs in `needs` too.

`notify` is last on purpose. A job with `when: on_failure` runs when any job in an earlier stage failed, and in the terminal stage "earlier" means everything, publish included.

One small thing that saves real money: the checkout is shallow, and heavy test data stays out of the default pull (in my case recorded camera footage, but any multi-gigabyte fixture qualifies). Only the job that actually reads it, here the integration job, pulls it in.

## One Toolchain, Pinned Once

This is the "cross-compiling is hard" excuse, so it gets the first real section. What's here: the version file, the cross job, and why one version string pins both the compiler and the board's firmware.

There are two images. The target SDK image carries the vendor toolchain for the board; the host image carries everything else (x86 compilers, linters, test tools). Both versions are pinned in one committed file:

```yaml
variables:
  HOST_IMAGE_VERSION: v3.2.0
  TARGET_SDK_IMAGE_VERSION: v1.8.0
```

Two image tags, nothing floating. The pipeline includes this file as CI configuration, and the local tooling parses the same two keys out of it. The cross build is the only job that overrides the pipeline's default image:

```yaml
build-cross-compile:
  stage: build
  image: ${TARGET_SDK_IMAGE}:${TARGET_SDK_IMAGE_VERSION}
  variables:
    BUILD_OUTPUT_DIR: build/aarch64/release
  needs: [prefetch-artifacts] # the prepare-stage fetch jobs
  before_script:
    # ... the shared checkout lines from default.before_script, repeated verbatim
    - source /opt/activate-sdk.sh
    - export VERSION_NUMBER="$(cat VERSION)"
    - export VERSION_TAG="v${VERSION_NUMBER}.${CI_PIPELINE_IID}"
  script:
    - ./ci/scripts/build.sh --target aarch64
    - ./ci/scripts/package.sh --version "${VERSION_TAG}" --out target-package.tar.gz
```

The SDK brings the cross compiler and the target sysroot, and it's activated by sourcing one script inside the image before any build command. No host toolchain or host header is read, ever. Which build tool sits behind `build.sh` doesn't matter here; it only has to take its compiler and sysroot from the environment the SDK sets up. That repeated-checkout comment is a GitLab gotcha that bit me: a job-level `before_script` replaces the default one instead of merging with it[^default], so any job that needs its own setup has to repeat the shared lines.

Host and target builds write to separate output directories, `build/x86_64/release` and `build/aarch64/release`, with separate cache keys, so neither can poison the other. Every configuration gets its own (release, ASan, TSan, target). The package version is derived in the job from a committed `VERSION` file plus the pipeline's iteration number, so nobody types a version by hand.

The SDK version is also the firmware version, on purpose: the SDK image is built from the same release as the board firmware, so the sysroot matches what actually runs on the device. Let them drift and you get a binary that links on the runner and falls over on the board. So one key has three readers:

<img src="/img/ci-for-embedded-projects/sdk-version-pin.svg" width="1024" alt="">

The flash tool picks the firmware release from it, and the fleet check treats it as the minimum firmware a board may run (a board below it turns the hardware job red). So a toolchain bump is never just a toolchain bump, and the declaration carries a comment saying exactly that.

## Local Equals CI, Mostly

I like having a single entry point: one script in the repo root that knows every tool the project uses, so nobody has to remember which linter wants which flags or which image the cross build runs in. Here it's `./dev.sh`, a plain dispatcher with no build logic of its own (with Bazel you mostly don't need it, more on that later). Every verb calls the same script its CI job calls. e2e follows the same pattern: `./dev.sh e2e --scenario=video-stream` runs one scenario of the same on-device verifier (is the board actually streaming frames, at the rate it should?) against whatever board is plugged into your machine. The whole mapping:

<img src="/img/ci-for-embedded-projects/local-ci-parity.svg" width="1024" alt="">

The scripts don't care who calls them:

```bash
START_CONTAINER=true
if [[ "${CI:-}" == "true" ]]; then
    START_CONTAINER=false   # the runner already started the job in the pinned image
fi
```

For build, test and lint, both sides run inside the same pinned image (e2e talks to a real board, so there's no image to share there). In CI the runner has already started the job in that container, so the script just calls the tool; on a laptop the script starts the container itself with `docker run`. Same binary, same config. Even "what changed" is computed inside the image, so the two sides can't disagree about the comparison commit. That's same image, same scripts, same flags; bit-identical output is a stronger claim, and I'm not making it here.

Now the cracks. A dispatcher is a convention, not a fence: nothing stops someone from calling the build tool directly, and that's fine as long as both paths pass the same flags. Pin the whole image reference in one place, not just the tag, or a registry move turns into a hunt through every script that hard-codes the path. And some divergences are deliberate:

| Divergence                                                             | Direction                           |
| ---------------------------------------------------------------------- | ----------------------------------- |
| Local integration diff includes uncommitted and untracked files        | fail-wide, you over-test            |
| Local e2e needs a board on your desk, and without one you just skip it | fail-narrow, and no script fixes it |

Fail-narrow is the dangerous direction: something reaches CI unchecked. The last row is why the board job runs on merge requests at all, even as a non-blocking one.

## Lint

One lint job per language, whatever linters you prefer inside them. Two things matter more than the tool choice. Lint the branch diff, not the whole tree, or nobody will ever fix the backlog and the job becomes noise. And let the C++ linter reuse the compilation database from the build job instead of regenerating it; C++ static analysis is slow enough already.

## Unit Tests, Three Times Over

<img src="/img/ci-for-embedded-projects/unit-test-configs.svg" width="1024" alt="">

One suite, three configurations, separate outputs so objects and results never mix. Why two sanitizer jobs and not one? ASan and TSan can't live in the same binary: both take over the process's memory layout for their shadow memory, and the compiler refuses `-fsanitize=address,thread` outright. UBSan and LSan have no such conflict, so they ride along with ASan, and TSan gets a build of its own. To be precise about my own pitch: it's the _compiled_ tests that run under sanitizers, the Python integration tests run once. The ASan job builds in parallel and tests serially, with a shared-memory purge in between:

```yaml
- ./ci/scripts/build.sh --sanitize address,undefined --no-test
- find /dev/shm -mindepth 1 -delete 2>/dev/null || true
- ./ci/scripts/test.sh --sanitize address,undefined --jobs 1 --junit
```

It looks like an obvious thing to "optimize" into one parallel call, so an audit fails the pipeline if someone does. Unchanged binaries don't re-run: each pass is a stamp file the build tool caches like any other target. And reviewers read failures in the merge request, not in a job log, because every test job publishes JUnit[^junit].

## Caching Sanitizer Builds

GitLab's `pull-push` cache downloads and uploads the whole directory on every run[^cache]. Fine for a release build, ruinous for multi-gigabyte sanitizer objects. So the two sanitizer jobs rsync to a cache host instead and move only the delta. On my project that took a warm sanitizer job from about 25 minutes down to about 3. Both caches are trimmed by age before saving, and a cache failure never fails a job.

## Integration Tests: Run What the Diff Touches

The full integration suite is too slow for every push, and a hand-picked subset is how tests silently stop running. So nobody maintains a test list: the suite is whatever test files exist in the repo, and an audit checks that the test runner sees the same set. On a merge request, only the part the diff can reach runs:

<img src="/img/ci-for-embedded-projects/integration-test-selection.svg" width="1024" alt="">

A change reaches a test in one of three ways: the test lives next to the changed code, the test imports the changed file, or somebody declared the link by hand. That last one is for couplings no scanner can see, like a test that spawns a binary or reads a video file. Master and nightly runs always run everything, which is what makes a miss on a merge request cheap (rule 4 again). On my project the selector cut merges that needed the full suite from roughly 40% to around 10%.

The same diff decides one more thing: whether the expensive jobs exist at all. No C++ change, no sanitizer jobs. Nothing changed in what goes onto the board, no board job.

Every decision lands in a short report next to the test results, so nobody has to reverse-engineer why a test did or didn't run:

```text
video/encoder/encoder.cc -> video/encoder/test/   (same directory)
docs/ci.md               -> ignored
selected: 1 of 24 test directories
jobs: test, test-asan, test-tsan (C++ changed); no smoke-e2e
```

A few audits keep the pipeline config, the selector and the test runner agreeing with each other, and if the report and the visible job graph disagree, that's a pipeline bug.

## Bazel Would Have Done Half of This

The previous section is a lot of machinery, and here's where it comes from:

| What I built                              | What Bazel gives you                                       |
| ----------------------------------------- | ---------------------------------------------------------- |
| Scanning for which tests a change reaches | `bazel query` with `rdeps` on the changed file             |
| Hand-written coupling declarations        | `deps` and `data` on the test target                       |
| Audits keeping all of it honest           | the build graph, enforced by the build                     |
| Test stamp files                          | test results cached by action key                          |
| `dev.sh` and its docker wrapping          | `bazel build` and `bazel test` with configs in `.bazelrc`  |
| Target SDK image                          | toolchain and sysroot fetched and checksummed by the build |

I reinvented a chunk of Bazel, poorly, because I couldn't use it on this project. In pi-bazel there's no SDK image at all, and the cross build is `bazel build --config=pi //...`[^pibazel]. It doesn't kill every local/CI difference (a `user.bazelrc` still can), which is why it keeps a separate `--config=ci`.

Without Bazel it's still doable. SCons, CMake with CTest and ccache, Meson: any of them covers the C++ half with content signatures and stamps. The cross-language graph is yours to write and audit. Budget for it.

## The Board in the Loop

The second classic excuse is "you can't automate on-device tests". You can. Boards hang off a dedicated runner (tag `hil`) that nothing else can reach. Each board needs two channels. A control plane drives it: reads state, writes config, reboots it. A data plane carries what the device does in real life, so the board talks to a mock backend on the runner (say, the server it streams video to) like it would to the real one. In my setup that's ADB over USB and WiFi, but the data plane could just as well be Ethernet or LTE, and ADB is just what my boards happen to speak. A board without it can be driven over its serial console instead, through the debug UART and a USB-TTL adapter on the runner. Wire that up even if you have ADB: the bootloader and the early kernel log come out on that UART, long before ADB or the network exist, so it's the cheap way to see why a board didn't come back after a flash. (JTAG goes deeper, but nobody hangs a debugger off every CI board. And some production images switch the console off, so check yours.) A USB-controlled relay or a smart plug on the board's power closes the loop, so a hung board gets power-cycled by the job instead of by a person walking to the rack:

<img src="/img/ci-for-embedded-projects/hil-runner.svg" width="1024" alt="">

Two boards is just what fits in the picture, and it's the minimum I'd aim for: with one, a single dead board stalls every pipeline. More is better, since each extra board is one more job running in parallel. One job's life looks like this:

<img src="/img/ci-for-embedded-projects/hil-job-sequence.svg" width="1024" alt="">

A job needs a way to lock a board: exclusive ownership of one device for the length of the run, so two pipelines never flash the same board at once. Make the lock per board, not per pool. A single mutex over all boards (which is what CI-level locks like GitLab's `resource_group` give you) serializes every hardware job no matter how many boards are free; a lock per board lets every free board take a job. In my case it's a plain file lock per board on the runner, nothing fancier. And do the cleanup when the next job claims the board, not at the end of the current one: a cancelled or crashed job never cleans up reliably, but the next job always runs its claim.

Per commit, CI runs only a short smoke subset of the verifier's scenarios: is the board alive and streaming? The camera shows up, the stream starts, frames reach the backend at the expected rate and resolution, and the stream comes back after the network drops for a few seconds. Quick checks only, no soak runs. An unknown scenario name fails before anything runs, so a typo can't quietly shrink coverage. And here's the one exception to "red blocks merge":

```yaml
smoke-e2e:
  extends: .hil-e2e # allow_failure: true, retry once on runner_system_failure
  rules:
    - if: '$NOTIFY_ONLY == "true"'
      when: never
    - if: "$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH"
      allow_failure: false
    - !reference [.gated_rules_prelude, rules]
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
      changes: [... payload-gate patterns ...]
    - when: never
```

On a merge request a failing board shows orange and the pipeline still passes[^allowfail]; on master the second clause makes it blocking. A physical board on a real network fails for reasons that have nothing to do with the diff, and blocking merges on that trains people to hit retry without reading.

## Supersede, Publish, Notify

Pushing again to a merge request cancels the old pipeline's interruptible jobs[^autocancel]. Everything is interruptible by default except three things you don't want killed halfway: publishing (three uploads in a row), flashing a board, and the alert about a broken master.

The alert itself is a three-clause rule:

```yaml
.notify_rules:
  rules:
    - if: '$NOTIFY_ONLY == "true" && $CI_COMMIT_BRANCH != $CI_DEFAULT_BRANCH'
      when: always
    - if: "$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH"
      when: on_failure
    - when: never
```

The middle clause does the work: any failure on master posts to the team chat through a webhook, Slack or whatever your team actually reads. The first one is an exercise mode: set `NOTIFY_ONLY` on a branch and only the alert runs, so you can test it without claiming a board or publishing anything.

The announcement is the part teams skip, and it's the part that matters most. No public announcement, no fast reaction. A red master that only shows up as an icon in the GitLab UI stays red until someone needs to merge, and by then three more commits are stacked on top and nobody remembers which one broke it.

It has one blind spot: it can't tell a board fault from a code regression, so somebody still has to open the job.

## Nightly: Run Everything, Loudly

|                               | Merge request              | Master                 | Nightly                               |
| ----------------------------- | -------------------------- | ---------------------- | ------------------------------------- |
| Integration tests             | diff-selected              | full suite             | full suite                            |
| Compiled tests, three configs | when gated paths change    | always                 | always                                |
| Board scenarios               | smoke subset, non-blocking | smoke subset, blocking | all of them, including long soak runs |
| Chat alert                    | none                       | on failure             | every run                             |

The per-commit pipeline should be deliberately incomplete. A few quick stream checks is a smoke test, and the slow failures (a stream that degrades after an hour, a board that throttles once it heats up, a leak that only shows up overnight) never show up in it. Running everything on every merge is too slow and ties up boards, even on master. So run the whole thing once every 24 hours from master: every scenario, the soak runs, the full integration suite, every gated job. And post the result to the team chat whether it passed or failed. A nightly run that fails quietly is just a slower way of not testing.

If I were starting from scratch, I'd buy more boards than seems reasonable and pick Bazel on day one. The boards turn into parallel jobs, and Bazel deletes half of the selection machinery before you ever have to write it.

[^default]: [GitLab CI/CD YAML reference: `default` and `before_script`. Default configuration does not merge with job configuration.](https://docs.gitlab.com/ci/yaml/)

[^junit]: [GitLab CI/CD artifacts reports: `artifacts:reports:junit`.](https://docs.gitlab.com/ci/yaml/artifacts_reports/)

[^cache]: [GitLab CI/CD caching: `cache:policy` and the cache archive and extraction order.](https://docs.gitlab.com/ci/caching/)

[^pibazel]: [Cross-Compiling C++ with Bazel: Platforms, Toolchains and the Exec/Target Split, and the companion repo astavonin/pi-bazel.](https://sysdev.me/2026/10/19/bazel-cross-compilation/)

[^needs]: [GitLab CI/CD: `needs`. Jobs start as soon as their dependencies finish, regardless of pipeline stages.](https://docs.gitlab.com/ci/yaml/needs/)

[^allowfail]: [GitLab CI/CD YAML reference: `allow_failure`.](https://docs.gitlab.com/ci/yaml/)

[^autocancel]: [GitLab CI/CD YAML reference: `workflow:auto_cancel:on_new_commit` and `interruptible`.](https://docs.gitlab.com/ci/yaml/)
