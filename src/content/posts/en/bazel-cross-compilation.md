---
title: "Cross-Compiling C++ with Bazel: Platforms, Toolchains and the Exec/Target Split"
description: "As far as I'm concerned, Bazel is the best build tool you can pick today, as long as it supports your language."
date: 2026-10-19
slug: "bazel-cross-compilation"
lang: en
category: cpp
tags: ["Bazel", "Tooling", "Raspberry Pi"]
cover: "/img/bazel-cross-compilation/alamedin-camp.jpg"
featured: false
---

<figure style="float: left; width: 300px; margin: 0 1em 1em 0;">
  <a href="/img/bazel-cross-compilation/alamedin-camp.jpg" target="_blank">
    <img src="/img/bazel-cross-compilation/alamedin-camp.jpg" alt="" width="250">
  </a>
  <figcaption>
    Alamedin gorge. The tent goes where the ground is flat, not where the view is. Nothing required those to be the same place.
  </figcaption>
</figure>

A real dependency graph, hermetic toolchains, a remote cache that actually works, one command to build and test everything. And yet every time I bring it up with embedded people, the first question is the same: fine, but what about cross-compilation?

Fair question. Most of us grew up with a vendor SDK that hijacks the shell through an `environment-setup` script, or with the "just build it on the board" approach because it looks simpler. It isn't simpler. A Raspberry Pi 5 is a decent target and a lousy build machine, and nothing about an ARM CPU requires the compiler to run on it.

So here's a small and fairly well-known example, done the way I think it should be done: C++23 built on an x86_64 Linux host for an aarch64 Linux device. The device is a Pi 5 because that's the board sitting on my desk. Swap in any ARM64 Linux board and the mechanics stay the same. The code lives in pi-bazel[^repo], and the whole cross setup is a 137-line `MODULE.bazel`, a 23-line `.bazelrc` and two `platform()` declarations. No hand-written `cc_toolchain_config`, no `select()` anywhere in the tree, no `#ifdef` on architecture in the sources.

## Platforms Instead of `--cpu`

If you touched Bazel C++ cross builds a few years ago, you remember `--cpu=aarch64` plus `--crosstool_top`. The CPU name was a lookup key into a crosstool file, the host compiler was a second lookup through `--host_cpu`, and anything that wasn't a C++ compiler had no mechanism at all. Forget it. Bazel 9 still accepts `--cpu`, but nothing in this repo reads it.

The current model is constraint matching[^platforms]. A _platform_ is a set of constraint values (CPU, OS, whatever axis you define). A _toolchain_ declares two sets of constraints: `exec_compatible_with` says where the tool runs, `target_compatible_with` says what it produces output for. Every build has one target platform, set with `--platforms`, and a list of execution platforms where actions may run. For each toolchain type a rule needs, Bazel walks the registered toolchains and takes the first one whose target side fits the target platform and whose exec side fits some available execution platform[^toolchains].

And that's the whole trick. Cross-compilation stops being a special mode: it's simply the case where the matched execution platform and the target platform differ.

Here's every platform the project defines:

[`bazel/platforms/BUILD.bazel:1-17`](https://github.com/astavonin/pi-bazel/blob/5c4ba20/bazel/platforms/BUILD.bazel#L1-L17)

```python
package(default_visibility = ["//visibility:public"])

platform(
    name = "host",
    constraint_values = [
        "@platforms//cpu:x86_64",
        "@platforms//os:linux",
    ],
)

platform(
    name = "pi5",
    constraint_values = [
        "@platforms//cpu:aarch64",
        "@platforms//os:linux",
    ],
)
```

Two constraints each, all from `@platforms`. You might expect a Cortex-A76 constraint on `pi5`, but `@platforms//cpu` only knows `cortex-r52` and `cortex-r82` among the `cortex-*` values, so A76 tuning ends up as a compiler flag, attached to the Pi's toolchain in `MODULE.bazel` (next section). A project-local `constraint_setting` for the microarchitecture would earn its place the day two aarch64 toolchains have to be told apart during resolution. With one target board, it's ceremony.

Strictly speaking, `:host` is optional, since Bazel's default host platform already carries `x86_64` and `linux`. I keep it anyway because it gives CI a label to pin and gives the execution platform list a first entry I control (more on that later).

<img src="/img/bazel-cross-compilation/toolchain-resolution.svg" width="640" alt="">

Note the bottom box. Both builds run every action on the same x86_64 machine; only the target side of the match moves.

## One Config per Target

Picking the target is a named config in `.bazelrc`. `bazel build --config=host //...` is the host build, for the workstation; `bazel build --config=pi //...` is the Pi build. Each config is nothing but a platform choice, and this is every per-target line in the file:

[`.bazelrc:14-16`](https://github.com/astavonin/pi-bazel/blob/5c4ba20/.bazelrc#L14-L16)

```
build:host --platforms=//bazel/platforms:host

build:pi --platforms=//bazel/platforms:pi5
```

The whole `.bazelrc` is 23 lines, and the rest is lockfile strictness, three output-directory flags covered near the end, a CI config, test output settings and a `user.bazelrc` import. The A76 tuning used to live here too, as two `build:pi --copt` lines. That had a real gap: the tuning was tied to a config name, not to the target, so a plain `bazel build --platforms=//bazel/platforms:pi5` produced an untuned binary without a word of complaint. The flags now sit on the toolchain itself, keyed to the Pi's target pair:

[`MODULE.bazel:77-84`](https://github.com/astavonin/pi-bazel/blob/5c4ba20/MODULE.bazel#L77-L84)

```python
    # @platforms has no cortex-a76 constraint value, so A76 tuning can only be a
    # compiler flag rather than a platform property. Keyed to the target pair
    # rather than set under build:pi, so the tuning follows the toolchain: a
    # plain --platforms=//bazel/platforms:pi5 build gets it too.
    extra_compile_flags = {"linux-aarch64": [
        "-mcpu=cortex-a76",
        "-mtune=cortex-a76",
    ]},
```

`aquery` on that bare `--platforms` build found zero tuning flags before the move and two after. Keying by pair also keeps the flags out of everything else. The host compile action carries no `cortex-a76` flag, and neither will a tool that runs during the build (a code generator, say), because those get built for the exec platform, which is `x86_64-linux`.

There's no `--extra_toolchains` line, and that's worth a detour, because an earlier version of this repo had one. The host toolchain was registered globally with `register_toolchains("@llvm_host//:all")` and the cross one was selected by label, on the theory that registering both would leave resolution order to arbitrate between them. The theory was right. The premise was wrong.

Ask `toolchains_llvm` what `@llvm_pi` actually generates and you get five:

```
$ bazel query '@llvm_pi//:all' | grep cc-toolchain-
@llvm_pi//:cc-toolchain-aarch64-linux
@llvm_pi//:cc-toolchain-riscv32-none
@llvm_pi//:cc-toolchain-riscv64-none
@llvm_pi//:cc-toolchain-x86_64-linux
@llvm_pi//:cc-toolchain-x86_64-none
```

That's the `aarch64-linux` pair, the native `x86_64-linux` pair, and three bare-metal pairs that need no sysroot. Now run the same query against the host-only toolchain the repo used to have (`git checkout f550049` first, since it no longer exists on `main`) and you get exactly those five minus `aarch64-linux`. `toolchains_llvm` emits a cross pair only when it has a sysroot for it, and the host toolchain had none, so it could never have shadowed the Pi. `@llvm_pi` is a strict superset: diff the two generated `BUILD` files at that commit and you get 144 added lines, nothing removed and nothing changed.

Which inverts the fix. Registering both would put two `x86_64-linux` candidates in front of every host build, with order picking the winner, so I registered `@llvm_pi//:all` alone and deleted the host toolchain entirely:

[`MODULE.bazel:134-137`](https://github.com/astavonin/pi-bazel/blob/5c4ba20/MODULE.bazel#L134-L137)

```python
# Registered globally rather than selected by label under build:pi. Nothing
# arbitrates: aarch64-linux is the only candidate for //bazel/platforms:pi5,
# x86_64-linux the only one for :host.
register_toolchains("@llvm_pi//:all")
```

That's the whole mechanism, and it's why `.bazelrc` above has nothing to say about toolchains any more: it picks a platform and the registration does the rest. One registration serves both configs, and the `--extra_toolchains` line goes away along with nineteen lines of `MODULE.bazel`. I compared the link command lines before and after under both configs: flag for flag identical, down to the sysroot path and the order of the archives. The only thing that changes is which repo's `cc_wrapper.sh` runs, and the two are byte-identical.

The `:all` in that line isn't special syntax. It's the ordinary "everything in this package" pattern, and `@llvm_pi` holds 120 targets: filegroups, the `cc_toolchain` rules, wrappers for `clangd` and `clang-format`, and so on. `register_toolchains` silently skips everything that isn't a `toolchain()` and keeps the five that are. I'd rather have that than a hand-written list of labels. A `toolchains_llvm` upgrade that adds or renames a target would leave an explicit list quietly incomplete, while `:all` just picks up whatever got generated.

Registering a toolchain doesn't mean it gets used, though. All five land in the candidate list, and resolution throws out the ones whose constraints don't fit. `--toolchain_resolution_debug` shows it happening (repo prefixes shortened, most rejections cut):

```
$ bazel cquery --config=pi \
    --toolchain_resolution_debug='@bazel_tools//tools/cpp:toolchain_type' \
    //src/hello:hello

ToolchainResolution:   Toolchain @@…llvm_pi//:cc-toolchain-aarch64-linux (resolves to
  @@…llvm_pi//:cc-clang-aarch64-linux) is compatible with target platform, searching
  for execution platforms:
ToolchainResolution:   Rejected toolchain @@…llvm_pi//:cc-toolchain-x86_64-linux
  (resolves to @@…llvm_pi//:cc-clang-x86_64-linux) ; mismatching values: x86_64
ToolchainResolution:   Rejected toolchain @@…local_config_cc_toolchains//:cc-toolchain-k8
  (resolves to @@…local_config_cc//:cc-compiler-k8) ; mismatching values: x86_64
```

Every line names two targets because `cc-toolchain-*` is the `toolchain()` wrapper that gets registered, and `cc-clang-*` is the actual `cc_toolchain` behind it. The last line isn't mine at all: `rules_cc` (and `apple_support`) register their own autodetected toolchains, and resolution walks past those too. If a rerun prints nothing, that's the analysis cache. The debug output only appears when resolution actually runs.

There's one cost. With `@llvm_host` gone, host builds come out of `@llvm_pi` too, from its `x86_64-linux` toolchain. So every setting in the `llvm.toolchain(name = "llvm_pi")` block also applies to host builds, unless it's keyed to a specific target pair. `stdlib` is the one that matters here. It's keyed to `linux-aarch64`, so only Pi builds get `libc++`. Change the key to `""` (an easy mistake when the block is literally named `llvm_pi`) and host builds quietly switch away from `builtin-libc++` as well. A separate host toolchain made that mistake impossible. Now the only guard is a comment above that line in `MODULE.bazel`.

## Where the Toolchain Comes From

Writing a `cc_toolchain_config` by hand is a waste of a weekend. `toolchains_llvm`[^tllvm] generates the toolchain, its features and its flag sets from a few tags in `MODULE.bazel`, so the interesting work is in the parts it can't decide for you.

The first one surprised me. An LLVM release tarball is two different things glued together. `LLVM-23.1.0-Linux-X64` carries `clang`, `clang++` and `ld.lld` as x86_64 binaries, which every build needs to _run_, plus x86_64 headers and `lib/x86_64-unknown-linux-gnu/libc++.a`, which the host build links and the Pi build can't use. The aarch64 archives only exist in `LLVM-23.1.0-Linux-ARM64`, whose binaries can't execute on my workstation at all. So the Pi toolchain, `@llvm_pi`'s `aarch64-linux` entry, is assembled from two distributions:

[`MODULE.bazel:74-115`](https://github.com/astavonin/pi-bazel/blob/5c4ba20/MODULE.bazel#L74-L115), with the two flag attributes elided:

```python
llvm.toolchain(
    name = "llvm_pi",
    cxx_standard = {"": "c++23"},
    # extra_compile_flags = {...}, extra_link_flags = {...}
    llvm_version = _LLVM_VERSION,
    # Keyed to the aarch64 target rather than "" because this toolchain also
    # serves host builds: an empty key would move them off builtin-libc++ too,
    # with nothing in a --config=host command line pointing at the cause.
    stdlib = {"linux-aarch64": "libc++"},
)
llvm.toolchain_root(
    name = "llvm_pi",
    label = "@llvm_x64//:BUILD",
)
llvm.target_toolchain_root(
    name = "llvm_pi",
    label = "@llvm_arm64//:BUILD",
    targets = ["linux-aarch64"],
)
llvm.sysroot(
    name = "llvm_pi",
    label = "@pi_sysroot//sysroot",
    targets = ["linux-aarch64"],
)
```

`toolchain_root` is the distribution whose binaries run. `target_toolchain_root` is the one you compile against and link with. Both tags read only the package path out of the label, which explains the odd-looking `@llvm_x64//:BUILD`. (Both trees are fetched by sha256 through a small repository rule of mine. It exists for a linker problem with my workstation's system libraries that has nothing to do with cross-compilation, so I'll skip it here.)

`@llvm_arm64` supplies more than the aarch64 runtime archives (`libc++.a`, `libc++abi.a`, `libunwind.a`, compiler-rt). Run `aquery` on a Pi compile action and you'll see `-resource-dir` pointing at `@llvm_arm64/lib/clang/23`, `-nostdinc++`, and two `-cxx-isystem` paths into `@llvm_arm64/include`. So the target-side C++ headers and the clang resource directory come from the ARM64 tree too. For the Pi build, the X64 tree contributes executables and nothing else. The host build gets everything from the X64 tree, because `x86_64-linux` has no `target_toolchain_root` and falls back to `toolchain_root`.

<img src="/img/bazel-cross-compilation/toolchain-sources.svg" width="1024" alt="">

One thing I didn't expect: pointing `toolchain_root` at a tree you've already fetched also skips `toolchains_llvm`'s own LLVM download. The generated `@llvm_pi` repo is 39 KB of BUILD files and a `cc_wrapper.sh`, not a third copy of a 12 GB distribution.

## The Sysroot

The C side (glibc headers, `libc.so.6`, `libm`, `libpthread`) comes from a sysroot. The obvious way to bring one in is `http_archive` plus a `filegroup` with a `glob()`. Don't. On the sysroot used here, that glob produces a warning naming 6,749 files, and every one of them becomes a separate input symlinked into every compile and link sandbox.

`toolchains_llvm` ships its own `sysroot` repository rule, and it declares the extracted tree as a single source directory (`srcs = ["."]`). That's one input in the action graph and one symlink per sandbox instead of thousands. It also extracts with a hermetic `bsdtar` instead of whatever `tar` the build machine has.

For now the sysroot itself is borrowed. Chromium builds Debian sysroots for its own cross-compiles and publishes them as immutable tarballs, and `toolchains_llvm`'s own tests use the same ones, so it was the quickest way to get a working one. Mine is their Debian stretch arm64 image, with glibc 2.24. The Pi runs 2.41 and glibc is forward-compatible in that direction, so the artifacts carry a _lower_ symbol floor than intended rather than a broken one. A Debian trixie snapshot replaces it next, and the label `@pi_sysroot//sysroot` won't move when that happens.

This is what reaches the linker. I pulled it with `bazel aquery --config=pi 'mnemonic("CppLink", //src/hello:hello)'` and trimmed the hardening flags:

```
exec external/toolchains_llvm++llvm+llvm_pi/bin/cc_wrapper.sh \
  -o bazel-out/pi5-fastbuild/bin/src/hello/hello \
  --target=aarch64-unknown-linux-gnu -fuse-ld=lld \
  -resource-dir external/+llvm_distribution+llvm_arm64/lib/clang/23 \
  -rtlib=compiler-rt -l:libunwind.a -lpthread -ldl \
  bazel-out/pi5-fastbuild/bin/src/hello/_objs/hello/main.pic.o \
  -Wl,--start-lib bazel-out/.../hello_lib/hello.pic.o -Wl,--end-lib \
  --sysroot=external/+sysroot+pi_sysroot/sysroot/ \
  -Lexternal/+llvm_distribution+llvm_arm64/lib \
  -Lexternal/+llvm_distribution+llvm_arm64/lib/aarch64-unknown-linux-gnu \
  -l:libc++.a -l:libc++abi.a
```

The detail I care about most is that `--sysroot` is workspace-relative. Nothing in the command line knows where my checkout lives, so the action key doesn't either. There's no shared cache here yet, but once there is, a CI runner and my workstation will compute the same key for this link even though the checkouts live at different paths. An absolute path would have made every machine's keys unique. (Why that output path says `pi5-fastbuild` gets a section near the end.)

If I had to recommend one Bazel habit for toolchain work, it's this one: when something looks wrong, read the action with `aquery`[^aquery] instead of guessing. Every finding in the next section came out of a command line or an input list.

## Defaults That Fail Quietly

### libstdc++ through the back door

`toolchains_llvm` controls the C++ runtime through a `stdlib` attribute, and the default is `builtin-libc++`: static libc++ and libc++abi, plus compiler-rt and libunwind. Sounds exactly like what I want. But when exec and target architectures differ, the toolchain config rewrites that default:

[`toolchain/cc_toolchain_config.bzl:437-438`](https://github.com/bazel-contrib/toolchains_llvm/blob/5370e47ae9d668a3a13a2da8818a2b72c907f8e1/toolchain/cc_toolchain_config.bzl#L437-L438) (toolchains_llvm 1.9.0)

```python
    if stdlib == "builtin-libc++" and is_xcompile and not is_darwin_exec_and_target:
        stdlib = "stdc++"
```

Leave `stdlib` alone and the Pi build takes its C++ standard library from the sysroot. With the stretch sysroot this project uses today, you find out immediately, because nothing compiles:

```
./src/hello/hello.h:3:10: fatal error: 'expected' file not found
    3 | #include <expected>
      |          ^~~~~~~~~~
```

`aquery` shows why. The compile action gets `-stdlib=libstdc++` and no `-nostdinc++`, so `<expected>` is looked up in `external/+sysroot+pi_sysroot/sysroot/usr/include/c++/6.3.0`, the libstdc++ headers that came inside the sysroot tarball. The build machine's own `/usr/include` plays no part. Debian stretch ships GCC 6.3, and its libstdc++ has no `<expected>`, `<flat_map>` or `<print>`. With the `libc++` key set, the same action gets `-nostdinc++` and two `-cxx-isystem` paths, and the headers come from `@llvm_arm64/include/c++/v1` instead.

A failing compile is the lucky outcome. With a sysroot whose libstdc++ is new enough, the build goes green and nothing tells you that the binary now loads `libstdc++.so.6` from the Pi at runtime, or that `hello_test` on the workstation exercises libc++ while the Pi runs libstdc++. The neighbouring branch, an empty `stdlib` on a cross build, at least prints a warning. This one prints nothing.

The fix is `stdlib = {"linux-aarch64": "libc++"}`, keyed by the target pair. An empty key would apply to every pair, including `x86_64-linux`, and drag the host build off `builtin-libc++` as well.

Except the `libc++` value isn't `builtin-libc++` minus the cross rewrite. It emits `-l:libc++.a -l:libc++abi.a` and nothing more, so the first link died like this:

```
ld.lld: error: undefined symbol: __aarch64_ldadd8_acq_rel
ld.lld: error: undefined symbol: __aarch64_ldadd8_relax
ld.lld: error: undefined symbol: __aarch64_cas8_acq_rel
```

Those are AArch64's outline-atomics helpers, small functions the compiler calls for atomic operations. `libc++.a` and `libc++abi.a` both use them, and they live in compiler-rt, which the `libc++` mode never links. It skips the unwinder, pthread and dl as well, all of which `builtin-libc++` brings along for free. Four flags on the toolchain, keyed to the Pi's pair again, put all of that back:

[`MODULE.bazel:85-95`](https://github.com/astavonin/pi-bazel/blob/5c4ba20/MODULE.bazel#L85-L95)

```python
    # The libc++ stdlib branch emits only -l:libc++.a -l:libc++abi.a, unlike
    # builtin-libc++: AArch64 outline-atomics live in compiler-rt, and libunwind,
    # pthread and dl are otherwise supplied for free. extra_link_flags appends to
    # the toolchain's own link_flags, so these land before the object files,
    # where builtin-libc++ puts them on the host.
    extra_link_flags = {"linux-aarch64": [
        "-rtlib=compiler-rt",
        "-l:libunwind.a",
        "-lpthread",
        "-ldl",
    ]},
```

`-rtlib=compiler-rt` brings in the atomics. `-l:libunwind.a` names the static archive on purpose: `-unwindlib=libunwind` looks equivalent, but it links the shared `libunwind.so` and puts a runtime dependency back on the Pi. `-lpthread` and `-ldl` resolve against the sysroot's glibc.

The attribute name matters. `toolchains_llvm` has two families of flag attributes, both keyed by target pair. `compile_flags`, `link_flags` and `link_libs` _replace_ the toolchain's computed defaults, so using them means restating everything the toolchain already emits. Their `extra_*` twins _append_ after the defaults, which is what you want almost every time.

Don't count on upstream to catch a regression here. `toolchains_llvm` 1.9.0's CI tests every `stdlib` value, but only in native builds[^tllvm-ci]. Its one cross-compile test leaves `stdlib` unset[^tllvm-xcompile], so it takes the silent libstdc++ path described above. Nothing upstream builds cross with `libc++`, so in this repo the ABI check further down is the only guard on that combination.

### A file nobody declared

The second quiet failure looked like a broken include path and wasn't one:

```
fatal error: '__config_site' file not found
```

The `-cxx-isystem` path pointed exactly where `__config_site` lives in the ARM64 tree. The file simply wasn't in the sandbox. Each compile action's inputs come from a generated filegroup:

[`toolchain/internal/configure.bzl:706-715`](https://github.com/bazel-contrib/toolchains_llvm/blob/5370e47ae9d668a3a13a2da8818a2b72c907f8e1/toolchain/internal/configure.bzl#L706-L715) (toolchains_llvm 1.9.0)

```python
filegroup(
    name = "compiler-components-{suffix}",
    srcs = [
        ":cxx_builtin_include_files-{suffix}",
        ":sysroot-components-{suffix}",
        "{llvm_dist_label_prefix}extra_config_site",
        "{toolchain_root}:clang",
        {extra_compiler_files}
    ],
)
```

`{llvm_dist_label_prefix}` is the _exec_ distribution. With one distribution serving both sides that's correct. With X64 as exec and ARM64 as target, it declares the x86_64 `__config_site` and nobody declares the aarch64 copy that the include path actually resolves to. The template quietly assumes exec and target are the same tree.

The fix is one tag:

[`MODULE.bazel:127-131`](https://github.com/astavonin/pi-bazel/blob/5c4ba20/MODULE.bazel#L127-L131)

```python
llvm.extra_compiler_files(
    name = "llvm_pi",
    label = "@llvm_arm64//:extra_config_site",
    targets = ["linux-aarch64"],
)
```

This is the pattern to recognise, because any cross setup built from two trees will hit it again: a sandboxed action fails not because a path is wrong, but because a correct path was never declared as an input. The error talks about a missing file. The actual bug is a missing declaration. `extra_compiler_files` and its twin `extra_linker_files` are the escape hatches, and `aquery`'s input list tells you which one you need.

## An Execution Platform Nothing Runs On

This block looks wrong, and most reviewers would recommend deleting it:

[`MODULE.bazel:15-21`](https://github.com/astavonin/pi-bazel/blob/5c4ba20/MODULE.bazel#L15-L21)

```python
# Test-toolchain resolution needs a registered execution platform matching the
# target platform before it consults a target's exec_compatible_with, so :pi5
# must be registered even though no action ever runs on aarch64 hardware.
register_execution_platforms(
    "//bazel/platforms:host",
    "//bazel/platforms:pi5",
)
```

No action in this project ever executes on aarch64. Remove `:pi5` anyway, and `bazel test --config=pi //...` fails at analysis:

```
ERROR: .../bazel/deploy/BUILD.bazel:5:8: While resolving toolchains for target
//bazel/deploy:device_smoke (d9c8cc0): No matching toolchains found for types:
  @@bazel_tools//tools/test:default_test_toolchain_type: By default, tests are
  executed on the first execution platform that matches all constraints specified
  by the target platform. Either register the target platform (or a platform with
  at least the same constraints) as an execution platform, or override the default
  behavior by registering a custom toolchain for
  @bazel_tools//tools/test:default_test_toolchain_type.
```

To its credit, Bazel 9 says exactly what to do. What's surprising is the reason. A test whose target platform is aarch64 needs an aarch64 execution platform to exist, even when its own `exec_compatible_with` sends every action to x86_64. Registering `:pi5` satisfies that check, and nothing ever runs on it. The other way out, a custom toolchain for `default_test_toolchain_type`, is more machinery for the same result. Restore the line and the suite goes green again.

Order matters here too. `:host` is listed first, so every action that doesn't constrain its own exec platform lands on the build machine. In a `--config=pi` build the compile, link and genrule actions all report `Execution platform: //bazel/platforms:host`, which is what you want.

## Tests That Know Which Side They're On

`target_compatible_with` is how one `bazel test //...` stays correct under both configs:

| Target                                    | `target_compatible_with` | `--config=host` | `--config=pi`      |
| ----------------------------------------- | ------------------------ | --------------- | ------------------ |
| `//src/hello:hello_test`                  | x86_64                   | runs            | skipped            |
| `//bazel/deploy:cross_artifact_abi_check` | aarch64                  | skipped         | runs, no Pi needed |
| `//bazel/deploy:device_smoke`             | aarch64                  | skipped         | runs, needs the Pi |

Incompatible tests are skipped, not failed, and that cuts both ways. Incompatibility is transitive, `data` edges included: a CPU constraint on `hello_lib` would make `hello` incompatible in the Pi build, `device_smoke` with it, and the run would report green with the device test silently skipped. That's why `hello_lib` stays unconstrained, with a comment saying so.

The two tests in `bazel/deploy` check an aarch64 binary from the x86_64 build machine, and Bazel can express that directly:

[`bazel/deploy/BUILD.bazel:41-56`](https://github.com/astavonin/pi-bazel/blob/5c4ba20/bazel/deploy/BUILD.bazel#L41-L56)

```python
sh_test(
    name = "cross_artifact_abi_check",
    size = "small",
    srcs = ["cross_artifact_abi_check.sh"],
    args = ["$(rlocationpath @llvm_x64//:readelf)"],
    data = [
        "//src/hello",
        "@llvm_x64//:readelf",
    ],
    exec_compatible_with = [
        "@platforms//cpu:x86_64",
        "@platforms//os:linux",
    ],
    target_compatible_with = ["@platforms//cpu:aarch64"],
    deps = ["@rules_shell//shell/runfiles"],
)
```

`target_compatible_with` puts the test in the Pi build, so `data` brings in `//src/hello` as the aarch64 binary. `exec_compatible_with` keeps the test itself, the `cross_artifact_abi_check.sh` script, on the x86_64 build machine. `@llvm_x64//:readelf` sits in `data` too and survives the aarch64 configuration only because it's a `filegroup` around a prebuilt binary; a `cc_binary` in the same slot would come out as aarch64 and fail to start. With that readelf, the script checks the two things all the toolchain work was for: the artifact is AArch64, and its `NEEDED` list has `libc.so.6` but no `libstdc++`, `libc++` or `libgcc_s`.

`device_smoke` has the same shape, plus `scp` and `ssh` to prove the binary actually runs on the Pi. `env_inherit` forwards `HOME`, `SSH_AUTH_SOCK` and `PI_SSH_HOST` to this one test only, and the `external` tag keeps its result out of the cache.

## One Output Directory for Two Targets

Until recently, both configs wrote to the same place. `bazel aquery` on the link action reported `bazel-out/k8-fastbuild/bin/src/hello/hello` under `--config=host` and `--config=pi` alike, so `bazel-bin/src/hello/hello` was whichever build ran last. I hit it while checking something else: an x86-64 ELF sitting at the path an aarch64 build had produced earlier in the same session. It's also why the ABI check lives inside the build graph and not as a `file bazel-bin/...` line in the README.

`k8` is Bazel's legacy CPU name for x86_64, and despite the look, no relation to k8s. It's named after AMD's K8, the Athlon 64 and Opteron family that shipped the first x86-64 chips, and it came over from Blaze, Google's internal build system, together with `piii` for 32-bit x86. `rules_cc` still carries the mapping[^k8]:

```python
return "k8" if arch in ["amd64", "x86_64", "x64"] else "piii"
```

The output directory is named `<cpu>-<compilation_mode>`, and `<cpu>` comes from the deprecated `--cpu` flag. Nothing here sets it, so Bazel falls back to the host's legacy name and every build gets `k8`, the Pi build included. That's also why `bazel config` shows `cpu: k8` for the Pi configuration right next to `platforms: //bazel/platforms:pi5`. It looks contradictory, but nothing reads that field, and `$(TARGET_CPU)` correctly says `aarch64`. The CPU value was never wrong. The target platform just never reached the path.

Three lines in `.bazelrc` fix it:

[`.bazelrc:10-12`](https://github.com/astavonin/pi-bazel/blob/5c4ba20/.bazelrc#L10-L12)

```
common --experimental_platform_in_output_dir=yes
common --experimental_override_platform_cpu_name=//bazel/platforms:host=host
common --experimental_override_platform_cpu_name=//bazel/platforms:pi5=pi5
```

The first puts a platform name in the output path instead of the CPU. The other two pick those names explicitly instead of leaving them to an inference scheme Bazel documents as experimental. Outputs now land in `bazel-out/host-fastbuild` and `bazel-out/pi5-fastbuild` and coexist on disk. The lines use `common` rather than `build` so `test`, `cquery` and `aquery` all agree on the paths. Both flags are still experimental, so a future Bazel may rename them.

Two things stay as they were. `bazel-bin` is a single symlink and still follows the last build, so a stable path means asking `bazel cquery --output=files`. And switching configs still discards the analysis cache, because `--platforms` is a configuration input no matter where the outputs land.

## Next Board, Next Steps

Moving this to a different aarch64 Linux board is a short edit: a new `platform()` (possibly with the same two constraints), different `-mcpu`/`-mtune` in `extra_compile_flags`, a different sysroot. A different architecture, say armv7 or riscv64, adds a matching `target_toolchain_root` distribution and a new `stdlib` key. `src/` doesn't change in either case, which was the point of keeping every per-target difference in the toolchain declaration.

For this project, the next step is replacing the stretch sysroot with a Debian trixie snapshot that matches the Pi's actual glibc. After that, GStreamer and friends go in through `third_party/` as C libraries. That last part matters more than it sounds: the static libc++ decision only holds as long as no C++ library from the sysroot ever lands on the link line. Then a remote cache, because `~/.cache/bazel` on my workstation is already at 62 GB.

[^repo]: [astavonin/pi-bazel on GitHub.](https://github.com/astavonin/pi-bazel)

[^platforms]: [Platforms. Bazel documentation.](https://bazel.build/extending/platforms)

[^toolchains]: [Toolchains: toolchain resolution. Bazel documentation.](https://bazel.build/extending/toolchains)

[^aquery]: [Action Graph Query (aquery). Bazel documentation.](https://bazel.build/query/aquery)

[^k8]: [rules_cc 0.2.22, `cc/private/toolchain/lib_cc_configure.bzl`.](https://github.com/bazelbuild/rules_cc/blob/21e14308c2afc7691f43295acc9852d9a6844f04/cc/private/toolchain/lib_cc_configure.bzl#L260)

[^tllvm]: [bazel-contrib/toolchains_llvm on GitHub, v1.9.0.](https://github.com/bazel-contrib/toolchains_llvm/tree/v1.9.0)

[^tllvm-ci]: [toolchains_llvm 1.9.0, `.github/workflows/tests.yml`: `external_test` and `xcompile_test`.](https://github.com/bazel-contrib/toolchains_llvm/blob/5370e47ae9d668a3a13a2da8818a2b72c907f8e1/.github/workflows/tests.yml#L77-L150)

[^tllvm-xcompile]: [toolchains_llvm 1.9.0, `tests/MODULE.bazel`: `llvm_toolchain_with_sysroot`.](https://github.com/bazel-contrib/toolchains_llvm/blob/5370e47ae9d668a3a13a2da8818a2b72c907f8e1/tests/MODULE.bazel#L220-L229)
