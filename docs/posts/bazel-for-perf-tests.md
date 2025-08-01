---
title: "Multilingual benchmarking project => Bazel for advanced engineering"
date: 2025-08-01
categories:
  - Tooling
  - Go
  - C++
  - Bazel
---

<figure style="float: left; width: 300px; margin: 0 1em 1em 0;" markdown>
  <a href="https://sysdev.me/img/molly-tash-rabat.jpeg" target="_blank">
    <img src="https://sysdev.me/img/molly-tash-rabat.jpeg" alt="caption" width="250">
  </a>
  <figcaption>
    In her one year, Molly saw many more exciting places than I did until I was about 28. She does pretty well :-D
  </figcaption>
</figure>

When working on performance experiments across C++ and Go, you obviously need a multilingual project structure. There were two paths forward: create separate build systems under a shared repository, or consolidate everything under a single, coherent framework. Bazel made that decision easy.

Using Bazel to unify builds isn’t just convenient—it should be the default choice for any serious engineering effort that involves multiple languages. It eliminates the friction of managing isolated tools, brings deterministic builds, and handles dependencies, benchmarking, and cross-language coordination with minimal ceremony.

Here’s why Bazel makes sense for performance-critical, multilingual projects like this one—no fragile tooling, no redundant setups, just clean integration that scales.
<!-- more -->

!!! info
    The project I'm talking about is available [here](https://github.com/astavonin/perf-tests).

## Structuring a Multilingual Bazel Project

I do not need any complicated structures here, as this repo is only about performance testing on multiple languages. For now, it's only Go and C++, but because of Bazel, it would be pretty easy to add additional language support.

```shell
perf-tests
├── daily-temps
│   ├── cpp
│   │   ├── BUILD.bazel
│   │   ├── daily_temperatures.cpp
│   │   ├── daily_temperatures.h
│   │   └── daily_temperatures_benchmark.cpp
│   └── go
│       ├── BUILD.bazel
│       ├── daily_temperatures.go
│       └── daily_temperatures_test.go
├── MODULE.bazel
└── BUILD.bazel
```

Structure is also standard for Bazel and covers all my needs. Each test has a separate language-specific folder. Considering the goal of comparing implementation on different languages, this is precisely what I need and is fully covered by Bazel out of the box.

## The Modern Bazel Modules Approach

Bazel used to rely on `WORKSPACE` files for dependency and toolchain management, but that approach quickly turns into a mess—too much boilerplate, too little structure. `MODULE.bazel` is the modern replacement, and it actually gets the job done. It lets you declare dependencies with proper versioning, avoids the usual transitive hell, and makes projects easier to share and compose. Instead of treating every repo like a silo, modules help build real ecosystems.

A typical module setup for a Go + C++ performance project may look like this:

```starlark
module(
    name = "perf_tests",
    version = "0.1.0",
)

bazel_dep(name = "rules_go", version = "0.55.1")
bazel_dep(name = "googletest", version = "1.14.0.bcr.1")
bazel_dep(name = "google_benchmark", version = "1.9.2")

go_sdk = use_extension("@rules_go//go:extensions.bzl", "go_sdk")
go_sdk.download(version = "1.23.1")
```

It's pretty evident that you have a much clearer separation between configuration and implementation with modules compared with the old `WORKSPACE` files approach. I love how it makes dependencies explicit and maintainable!

## Bazel's Advantage over CMake and Go Build Systems

Bazel handles multiple languages out of the box. Trying to do the same with CMake and Go’s native tooling is either painful or flat-out unworkable. CMake is great (primarily for historical reasons) for C++, but anything beyond that usually means wrestling with clunky extensions. Go’s build system works well—for Go—but it has zero awareness of external toolchains or how to wire them together. There’s no clean way to coordinate builds across both without gluing everything together by hand.

This is where Bazel actually delivers. It builds C++ and Go in the same context, tracks dependencies across both, and rebuilds only what’s necessary—no wrappers, no hacks. Outputs are reproducible regardless of language, which means CI doesn’t have to guess, and toolchain drift isn’t a thing.

## Joining Multilingual Performance Tests with Bazel Tags

Running benchmarks across languages is usually messy—different tools, different assumptions, no common entry point. Bazel simplifies this by letting you tag benchmark targets regardless of language. With consistent tags in place, you can query and run all benchmarks from a single script without needing language-specific logic. You can write it up pretty quickly:

### Tagging Benchmark Targets

C++ benchmark (`daily-temps/cpp/BUILD.bazel`):

```starlark
cc_binary(
    name = "daily_temperatures_benchmark",
    srcs = ["daily_temperatures_benchmark.cpp"],
    deps = [
        ":daily_temperatures",
        "@google_benchmark//:benchmark_main",
    ],
    tags = ["benchmark"],
)
```

Go benchmark (`daily-temps/go/BUILD.bazel`):

```starlark
go_test(
    name = "daily_temperatures_test",
    srcs = ["daily_temperatures_test.go"],
    embed = [":daily_temperatures"],
    importpath = "perf-tests/daily-temps/go",
    tags = ["benchmark"],
)
```

### Running All Benchmarks via Bash

With all benchmarks tagged consistently, a simple Bash script can query and execute benchmarks for multiple languages at once:

```bash
#!/bin/bash
set -euo pipefail

echo "Executing Go benchmarks..."
bazel test --test_output=streamed \
  --test_arg=-test.bench=. \
  --test_arg=-test.benchmem \
  --test_tag_filters=benchmark \
  --cache_test_results=no \
  //...

echo "Executing C++ benchmarks..."
cpp_benchmarks=$(bazel query 'attr(tags, "benchmark", kind(cc_binary, //...))')

for bench in $cpp_benchmarks; do
  echo "Running $bench"
  bazel run -c opt "$bench"
done
```

It might look crude, but using tags with a Bash runner is hard to beat for flexibility and portability. Bazel doesn’t natively support “run all benchmarks,” and this approach gives you exactly that—without reinventing anything. It scales across languages, plays well with CI, and stays out of the way.

---

Bazel handles complex multilingual builds in a way that legacy tools like CMake or language-specific systems simply don’t. With modules, tagging, and minimal scripting, even mixed-language benchmarks become easy to manage. For engineers who care about repeatability, clean integration, and performance visibility across stacks, Bazel isn’t just an option—it’s the default.