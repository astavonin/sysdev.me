---
title: "Managing Multi-Language Projects with Bazel"
date: 2025-01-14
categories:
  - Software Engineering
  - Tooling
tags:
  - C++
  - Bazel
---

<figure style="float: left; width: 300px; margin: 0 1em 1em 0;" markdown>
  <a href="https://sysdev.me/img/cpp-bazel.png" target="_blank">
    <img src="https://sysdev.me/img/cpp-bazel.png" alt="caption" width="250">
  </a>
</figure>

In today’s software development landscape, it’s rare to encounter a project built with just one programming language or platform. Modern applications often require integrating multiple technologies to meet diverse requirements. This complexity is both a challenge and an opportunity, demanding robust tools to manage dependencies, builds, and integrations seamlessly. Bazel, a powerful build system, is one such tool that has proven invaluable for multi-language projects.

Recently, I decided to extend my [Maelstrom challenges](https://github.com/astavonin/maelstrom-challenges) with a C++-based test to explore how Bazel can simplify managing multi-language dependencies and streamline development workflows.

## Why Bazel for Multi-Language Projects?


Bazel’s design philosophy emphasizes performance and scalability, making it an excellent choice for projects that involve multiple languages. With its support for Bazel modules, adding dependencies is as simple as declaring them in a MODULE.bazel file. For example, integrating the popular logging library spdlog is straightforward:
<!-- more -->
```python
bazel_dep(name = "spdlog", version = "1.15.0.bcr.3")
```

However, not every library supports Bazel modules natively, which can complicate things. A case in point is BOOST, a widely used C++ library. Adding BOOST required a bit of additional setup, fortunately, we have [rules_boost](https://github.com/nelhage/rules_boost) project:

```python
bazel_dep(name = "rules_boost", repo_name = "com_github_nelhage_rules_boost")

archive_override(
    module_name = "rules_boost",
    integrity = "sha256-ZLcmvYKc2FqgLvR96ApPXxp8+sXKqhBlCK66PY/uFIo=",
    strip_prefix = "rules_boost-e3adfd8d6733c914d2b91a65fb7175af09602281",
    urls = ["https://github.com/nelhage/rules_boost/archive/e3adfd8d6733c914d2b91a65fb7175af09602281.tar.gz"],
)

non_module_boost_repositories = use_extension("@com_github_nelhage_rules_boost//:boost/repositories.bzl", "non_module_dependencies")
use_repo(
    non_module_boost_repositories,
    "boost",
)
```

While the setup for BOOST is less elegant than for spdlog, Bazel’s flexibility ensures that even complex dependencies can be integrated efficiently.

## Improving Code Navigation with Hedron’s Compile Commands

Another critical aspect of C++ development is code navigation. Generating a `compile_commands.json` file makes life easier for developers using tools like Vim or Emacs. Thankfully, Bazel has a powerful solution: [Hedron Compile Commands Extractor](https://github.com/hedronvision/bazel-compile-commands-extractor).

It's pretty easy to set it up:

### 1. Add the dependency to your MODULE.bazel file:

```python
bazel_dep(name = "hedron_compile_commands", dev_dependency = True)

git_override(
    module_name = "hedron_compile_commands",
    commit = "4f28899228fb3ad0126897876f147ca15026151e",
    remote = "https://github.com/hedronvision/bazel-compile-commands-extractor.git",
)
```

### 2. Generate the compile_commands.json file by running:

```python
bazel run @hedron_compile_commands//:refresh_all
```

This simple addition dramatically improves the developer experience, making it easy to navigate and understand the C++ codebase. What I love even more there is NeoVim's [lsp-config](https://github.com/neovim/nvim-lspconfig) provides excellent navigation and auto-completion with the generated `compile_commands.json`.

## Building C++ Support in Maelstrom challenges

The process of adding C++ support to the [Maelstrom challenges](https://github.com/astavonin/maelstrom-challenges) project involved several key changes. In [this commit](https://github.com/astavonin/maelstrom-challenges/commit/8814adbc613b37b6e143aeb1506b2d5660bded0a), I outlined the required modifications to the `MODULE.bazel` file to set up the necessary dependencies. This provided the foundation for implementing a basic Maelstrom protocol in C++.

The implementation itself, along with a simple echo app as a proof of concept, can be seen in [this commit](https://github.com/astavonin/maelstrom-challenges/commit/f0be5f8a2928a30af7614c157145fa2cab0accc9). This example showcases how Bazel simplifies managing dependencies and building multi-language projects while allowing for robust testing and experimentation.