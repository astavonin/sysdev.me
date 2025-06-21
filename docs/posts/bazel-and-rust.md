---
title: "Bazel and Rust: A Perfect Match for Scalable Development"
date: 2024-12-29
categories:
  - Software Engineering
  - Tooling
tags:
  - Rust
  - Bazel
---

<figure style="float: left; width: 300px; margin: 0 1em 1em 0;" markdown>
  <a href="https://sysdev.me/wp-content/uploads/2024/12/rust_and_bazel.png" target="_blank">
    <img src="https://sysdev.me/wp-content/uploads/2024/12/rust_and_bazel.png" alt="caption" width="250">
  </a>
</figure>

Bazel never fails to impress, and its support for Rust demonstrates its versatility and commitment to modern development. Two distinct dependency management modes—Cargo—based and pure Bazel—allow developers to tailor workflows to their projects' needs. This adaptability is particularly valuable for integrating Rust applications into monorepos or scaling complex systems.
I decided to explore how Bazel supports Rust, including managing dependencies, migrating from `Cargo.toml` to `BUILD.bazel`, and streamlining integration testing.

## Harnessing Cargo-Based Dependency Management

Bazel’s ability to integrate with Cargo, Rust’s native package manager, is a standout feature. This approach preserves compatibility with the Rust ecosystem while allowing projects to benefit from Bazel’s powerful build features. By using [rules_rust](https://bazelbuild.github.io/rules_rust/), a Bazel module can seamlessly import dependencies defined in `Cargo.toml` and `Cargo.lock` into its build graph.
<!-- more -->
It was pretty easy to feed dependency information from Cargo to Bazel. The only tricky part is Cargo workspaces. If you use a Cargo workspace like I do, you should list all `Cargo.toml` files under the `manifests` section in `MODULE.bazel` file.

```python
crate = use_extension("@rules_rust//crate_universe:extensions.bzl", "crate")
crate.from_cargo(
    name = "crate_index",
    cargo_lockfile = "//:Cargo.lock",
    manifests = [
        "//:Cargo.toml",
        "//:echo/Cargo.toml",
        "//:tests/Cargo.toml",
    ],
)
use_repo(crate, "crate_index")
```

This setup allows Bazel to parse and manage dependencies from multiple `Cargo.toml` files. The [crate_universe](https://bazelbuild.github.io/rules_rust/crate_universe.html) extension ensures that Bazel respects the dependency versions specified in the lockfile, providing reproducible builds. This approach is particularly practical in projects with nested crates or submodules, as Bazel automatically consolidates them into a unified build graph.

Integrating with Cargo in this way provides the best of both worlds. Developers can continue using Rust’s native tooling for development while leveraging Bazel for its scalability and advanced dependency management. Although this dual-system approach adds some complexity, the flexibility it offers is invaluable for scaling projects and ensuring compatibility with the broader Rust ecosystem.

## Migrating from `Cargo.toml` to `BUILD.bazel`

The next step after making a proper `MODULE.bazel` file is to create `BUILD.bazel`. It's basically a translation of all component-level `Cargo.toml` files into `BUILD.bazel` one-by-one.

```ini
[package]
name = "echo"
version = "0.1.0"
edition = "2021"

[[bin]]
path = "src/main.rs"
name = "echo"

[dependencies]
async-trait = "0.1.83"
maelstrom-node = "0.1.6"
```

In Bazel, each `bin` section from `Cargo.toml` should be translated into a `rust_binary` definition in `BUILD.bazel`. Another important part here is `@crate_index` which refer to `crate.from_cargo(name = "crate_index", ...)` command from the `MODULE.bazel` described above.

```python
load("@rules_rust//rust:defs.bzl", "rust_binary")

rust_binary(
    name = "echo",
    srcs = ["src/main.rs"],
    proc_macro_deps = [
        "@crate_index//:async-trait",
    ],
    deps = [
        "@crate_index//:maelstrom-node",
    ],
)
```

This shift ensures that Bazel can handle the entire build lifecycle, from compiling dependencies to linking final binaries. While `Cargo.toml` defines dependencies and build metadata, `BUILD.bazel` brings this into Bazel’s optimized dependency graph. This transition is seamless for developers familiar with both systems and ensures scalability as the project grows.

## Simplifying Integration Testing with Bazel

Integration testing is another area where Bazel simplifies workflows compared to Cargo. In Rust’s native system, it’s not straightforward to ensure that an application is built before a test requiring that application is executed. With Bazel, this process becomes effortless.

Consider a `BUILD.bazel` setup for integration tests:

```python
load("@rules_rust//rust:defs.bzl", "rust_library", "rust_test")

rust_library(
    name = "utils",
    srcs = [
        "utils/lib.rs",
        "utils/paths.rs",
        "utils/runner.rs",
    ],
)

rust_test(
    name = "test_echo",
    size = "small",
    srcs = ["echo/test_echo.rs"],
    data = [
        ":maelstrom/lib/maelstrom.jar",
    ],
    deps = [
        ":utils",
        "//echo",
    ],
)
```

This configuration defines a `rust_test` that explicitly depends on the `//echo` binary. Bazel ensures that the binary is built before the test is executed, avoiding any manual coordination. Shared utilities used during the tests are included in a `rust_library`, promoting code reuse. Additionally, test resources like `:maelstrom/lib/maelstrom.jar` are specified as data, ensuring they are available during execution.

It took some Googling to figure out how to access external resources like `maelstrom.jar` for the Rust integration test. However, it's simpler than it appears at first. We basically need to retrieve the value from the `RUNFILES_DIR` environment variable, which points to a temporary Bazel-managed directory, and then add the `"_main"` folder on top of it.

```rust
pub fn bazel_runfiles_dir() -> PathBuf {
    PathBuf::from(env::var_os("RUNFILES_DIR").unwrap()).join("_main")
}

pub fn maelstrom_dir() -> PathBuf {
    bazel_runfiles_dir()
        .join("tests")
        .join("maelstrom")
        .join("lib")
}
```

Bazel’s approach eliminates the need for custom scripts or workarounds, streamlining the test lifecycle and ensuring reliable, reproducible results. This simplicity becomes increasingly important as projects grow, where manual processes can hinder productivity and introduce inconsistencies.