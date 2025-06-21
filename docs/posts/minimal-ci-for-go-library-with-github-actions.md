---
title: "Minimal CI for Go library with GitHub actions"
date: 2024-12-05
categories:
  - Software Engineering
  - Tooling
tags:
  - Go
  - CI
  - DevOps
---

<figure style="float: left; width: 300px; margin: 0 1em 1em 0;" markdown>
  <a href="https://sysdev.me/wp-content/uploads/2024/11/actions_and_go.png" target="_blank">
    <img src="https://sysdev.me/wp-content/uploads/2024/11/actions_and_go.png" alt="caption" width="250">
  </a>
</figure>

Continuous Integration (CI) has become an essential part of modern software development, and for good reason. It ensures code quality, speeds up development, and catches potential issues early. However, you can get started without an elaborate CI setup. Even a minimal CI setup can significantly improve your workflow. Here's why every project should have at least minimal CI and how to implement it effectively using GitHub Actions.

## What Constitutes Minimal CI?

For a project to benefit from CI without excessive complexity, it should include the following essential components:

1. **Project Compilation:** Verify that the codebase is always in a buildable state.
2. **Unit Test Execution:** Ensure the core functionality works as expected.
3. **Static Code Analysis:** Catch bugs and enforce coding standards before they become an issue.

<!-- more -->

## Why GitHub Actions?

GitHub Actions offers a simple yet powerful CI/CD platform that integrates seamlessly with GitHub repositories. Its ease of use makes it accessible even for developers without extensive DevOps experience. In fact, with just a few workflows, you can have a robust CI pipeline for small projects.

For example, for my small open-source Go library [GFSM](https://github.com/astavonin/gfsm), three workflows—**build**, **static-check**, and **publish**—are sufficient.

## Setting Up Your Workflows

!!! info
    A fully functional GitHub Actions-based CI example from [GFSM](https://github.com/astavonin/gfsm/tree/main/.github).


### 1. Build Workflow

The build workflow ensures your code compiles and passes tests on every <inl_code>push</inl_code> or <inl_code>pull_request</inl_code> to any branch:

```yaml
on: ["push", "pull_request"]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: prepare-env
        uses: ./.github/env
      - name: Build
        run: go build -v ./...
      - name: Test
        run: go test -v ./...
```

### 2. Static Code Analysis

Static analysis helps maintain code quality by catching potential issues early. The best Go linter at the moment - [staticcheck](https://staticcheck.dev), provides an excellent integration with GitHub actions out of the box. Like the build workflow, this workflow runs on every `push` or `pull_request`:

```yaml
jobs:
  ci:
    name: "Run CI"
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
        with:
          fetch-depth: 1
      - name: prepare-env
        uses: ./.github/env
      - uses: dominikh/staticcheck-action@v1
        with:
          version: "latest"
```

### 3. Publish Workflow

Publishing a new version to [pkg.go.dev](https://pkg.go.dev) ensures that users always have access to the latest updates. The tricky part is triggering the [pkg.go.dev](https://pkg.go.dev) proxy to update its cache for new versions. On comparison with `build` and `static-check` workflows, we should trigger new version publication only on a new tag push in a semantic versioning format. Here's how you can set up this workflow to track new tags and ping the proxy:

```yaml
on:
  push:
    tags:
      - 'v[0-9]+.[0-9]+.[0-9]+'

jobs:
  publish:
    name: "pkg.go.dev publishing"
    runs-on: ubuntu-latest
    steps:
      - name: Publishing new version
        run: |
          curl https://sum.golang.org/lookup/github.com/astavonin/gfsm@${{ github.ref_name }}
```

## Reusable Composite Actions

Both the `build` and `static-check` workflows require the same environment setup. To avoid duplicating this logic, use GitHub Actions' [composite](https://docs.github.com/en/actions/sharing-automations/creating-actions/creating-a-composite-action) feature to create a reusable setup action:

```yaml
runs:
  using: composite
  steps:
    - name: Setup Go
      uses: actions/setup-go@v5
      with:
        go-version: 1.23.x
    - name: Generate
      shell: bash
      run: |
        go get golang.org/x/tools/cmd/stringer@latest
        go install golang.org/x/tools/cmd/stringer@latest
        go generate ./...
```

This composite action ensures consistency and simplifies workflow maintenance.

## Looking Ahead

Go currently relies on the `tools.go` file for dependencies, which I find a too ugly approach and prefer to have some extra `go get/install/generate` in my environment setup yaml file. But Go 1.24 promises a much cleaner approach with its [track tool dependencies in go.mod (#48429)](https://github.com/golang/go/issues/48429) feature. Once available, it will streamline dependency management much more excellently.


## Final Thoughts

Implementing minimal CI with GitHub Actions requires minimal effort but yields significant benefits. By automating builds, tests, and static analysis, you can ensure your project maintains high quality and is always ready for deployment. For small projects, this setup is a no-brainer, and GitHub Actions makes it easy to get started.

