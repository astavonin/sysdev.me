---
title: "How to compile C++ in 2025. Bazel or CMake?"
date: 2025-01-20
categories:
  - Software Engineering
  - Tooling
tags:
  - C++
  - Bazel
  - CMake
  - Version Control Systems
---

<figure style="float: left; width: 300px; margin: 0 1em 1em 0;" markdown>
  <a href="https://sysdev.me/img/cpp_bazel_and_cmake.png" target="_blank">
    <img src="https://sysdev.me/img/cpp_bazel_and_cmake.png" alt="caption" width="250">
  </a>
</figure>

Today, we’re examining two modern build systems for C++: [CMake](https://cmake.org), the industry favorite, and [Bazel](https://bazel.build), a powerful alternative. While CMake is often the default choice, I believe that approach warrants a bit more scrutiny—after all, we’re focusing on modern tools here (yep, not counting Make, right?). To explore this, I’ve created a practical demo project showcasing how both systems manage a real-world scenario.

Using the [maelstrom-challenges](https://github.com/astavonin/maelstrom-challenges) project as a starting point, I’ve extracted a C++ library called [maelstrom-node](https://github.com/astavonin/maelstrom-node). This library has been set up to work seamlessly with both **Bazel** and **CMake**, giving us a hands-on comparison of their approaches, strengths, and quirks.

## The Project Structure

Here’s what the final directory layout for maelstrom-node looks like:

<!-- more -->

```bash
➜  maelstrom-node git:(main) tree
.
├── BUILD.bazel
├── CMakeLists.txt
├── CMakePresets.json
├── LICENSE
├── MODULE.bazel
├── MODULE.bazel.lock
├── README.md
├── include
│   └── maelstrom-node
│       ├── handler.hpp
│       ├── message.hpp
│       └── node.hpp
├── src
│   ├── CMakeLists.txt
│   ├── message.cpp
│   └── node.cpp
├── vcpkg-configuration.json
└── vcpkg.json
```

With this structure in place, the library could seamlessly integrate with both Bazel and CMake while maintaining clarity and modularity.

## Building with Bazel

Bazel provided a relatively straightforward approach to compile [maelstrom-node](https://github.com/astavonin/maelstrom-node). The key was to define two critical files: `MODULE.bazel` and `BUILD.bazel`.

### MODULE.bazel

The `MODULE.bazel` file in Bazel serves as a central place to define project metadata and manage dependencies. In this file, we use `bazel_dep` for some dependencies like spdlog and `nlohmann_json`, but not for `rules_boost`. Why the difference? It all comes down to how these dependencies are distributed and managed in Bazel’s ecosystem.

```python
module(
    name = "maelstrom_node",
    version = "1.0.0",
    compatibility_level = 1,
)

# Dependencies

# Adding spdlog and nlohmann_json via Bazel Dependency Archive
bazel_dep(name = "spdlog", version = "1.15.0.bcr.3")
bazel_dep(name = "nlohmann_json", version = "3.11.3.bcr.1")

# Adding rules_boost manually due to its unavailability in Bazel Central Registry
bazel_dep(name = "rules_boost", repo_name = "com_github_nelhage_rules_boost")
archive_override(
    module_name = "rules_boost",
    integrity = "sha256-ZLcmvYKc2FqgLvR96ApPXxp8+sXKqhBlCK66PY/uFIo=",
    strip_prefix = "rules_boost-e3adfd8d6733c914d2b91a65fb7175af09602281",
    urls = ["https://github.com/nelhage/rules_boost/archive/e3adfd8d6733c914d2b91a65fb7175af09602281.tar.gz"],
)
```

The `bazel_dep` function simplifies dependency management by fetching dependencies from the [Bazel Central Registry (BCR)](https://registry.bazel.build)—a curated collection of Bazel-compatible packages. Dependencies like **spdlog** and **nlohmann_json** are available in the BCR, which makes adding them straightforward and efficient. Using BCR ensures version consistency and eliminates the need for custom configuration.

### Why Not Use `bazel_dep` for `rules_boost`?

While popular, the `rules_boost` library is not often updated in the Bazel Central Registry, and while we have 1.86 release publicly available, BCR includes only 1.83. That's why, we ***may*** need to configure its source using `archive_override` manually. This involves specifying details like the URL of the archive, the integrity hash, and the strip prefix.

Using `bazel_dep` wherever possible simplifies project configuration by leveraging the Bazel Central Registry, ensuring that dependencies are well-maintained and easy to integrate. However, when libraries like `rules_boost` aren’t available in the registry, Bazel’s manual configuration options, like `archive_override`, allow us to include them. This dual approach showcases Bazel’s flexibility and ability to adapt to different project needs.

### BUILD.bazel

We cannot proceed without `BUILD.bazel`, as it serves as a location to store the actual app or library information.

```python
cc_library(
    name = "maelstrom_node",
    srcs = [
        "src/message.cpp",
        "src/node.cpp",
    ],
    hdrs = glob(["include/maelstrom-node/**/*.hpp"]),
    copts = [
        "-std=c++23",
    ],
    includes = ["include"],
    visibility = ["//visibility:public"],
    deps = [
        "@boost//:algorithm",
        "@boost//:asio",
        "@nlohmann_json//:json",
        "@spdlog",
    ],
)
```

The `includes = ["include"]` directive ensures Bazel can resolve headers using shorter paths like `#include "maelstrom-node/message.hpp"` instead of full paths like `#include "include/maelstrom-node/message.hpp"`.

To build the library, simply run:

```bash
bazel build //...
```

## Building with CMake

Adapting maelstrom-node for CMake brought its own set of challenges and solutions, exposing the limitations of this ancient technology. Despite its widespread use, even a straightforward migration effort highlighted CMake’s inherent bottlenecks and inefficiencies, reinforcing the idea that it might be time to consider moving on from it entirely.

### Managing Includes

This is the first challenge you'll face when trying to move from Bazel to CMake. CMake assumes `#include` paths are relative to the include directory, so you write:

```cpp
#include "maelstrom-node/message.hpp"
```

Bazel, on the other hand, often requires full paths from the project root unless explicitly configured using the includes property in the `cc_library` rule:

```cpp
#include "include/maelstrom-node/message.hpp"
```

While CMake’s shorter paths may appear cleaner within the source code and more natural for C++ developers, they abstract away the file hierarchy, making it harder to understand the project structure at a glance. As Bazel requires, full paths provide better context by explicitly showing where a file is located in the directory tree, making navigation and maintenance easier, especially in larger projects.

### Setting Up CMake and VCPKG

Using [vcpkg](https://vcpkg.io) as the package manager is one of the ways to simplify dependency management if you are a CMake fun. After installing vcpkg, I initialized the project and added the necessary ports. The following command will create `vcpkg-configuration.json` and `vcpkg.json` files:

```bash
vcpkg new --application
vcpkg add port boost-algorithm
vcpkg add port boost-asio
vcpkg add port nlohmann-json
```

Another option for CMake dependency management is **Conan**. However, based on my experience, it's even more complex than **VCPKG**, so I won’t discuss it in this post.

### Making a CMakeLists.txt

Managing dependencies was relatively streamlined using the vcpkg package manager. The toolchain file was included dynamically to ensure compatibility, allowing for flexibility when configuring the build environment. This setup reduces manual configuration efforts while ensuring that dependencies are correctly integrated:

```cmake
if(NOT DEFINED CMAKE_TOOLCHAIN_FILE)
    set(CMAKE_TOOLCHAIN_FILE "${CMAKE_SOURCE_DIR}/vcpkg/scripts/buildsystems/vcpkg.cmake"
        CACHE STRING "Vcpkg toolchain file")
endif()
```

The main part of the `CMakeLists.txt` file is standard for CMake projects. The maelstrom_node library is defined as a static library with its core functionality implemented in message.cpp and node.cpp. Dependencies such as Boost, nlohmann_json, and spdlog are configured using `find_package`, ensuring they are available during the build process.

```cmake
add_library(maelstrom_node STATIC
    src/message.cpp
    src/node.cpp
)

find_package(Boost REQUIRED NO_MODULE)
find_package(nlohmann_json REQUIRED)
find_package(spdlog REQUIRED)

target_include_directories(maelstrom_node PUBLIC
    ${CMAKE_SOURCE_DIR}/include
    ${Boost_INCLUDE_DIRS}
)

target_link_libraries(maelstrom_node PUBLIC
    nlohmann_json::nlohmann_json
    spdlog::spdlog
    Boost::headers
)
```

The `find_package` command works seamlessly in this setup because the vcpkg toolchain file is integrated into the project configuration. This file, specified as `CMAKE_TOOLCHAIN_FILE`, ensures that CMake knows the paths to all dependencies installed via vcpkg. When find_package is called, it searches these paths for the necessary configuration files, allowing dependencies like Boost, nlohmann_json, and spdlog to be located and linked automatically. This integration eliminates manual dependency management and ensures consistency across environments.

Finally, the installation section of the file ensures that the library can be packaged and reused in other projects. This includes specifying where the compiled library should be installed and ensuring that headers are copied to the appropriate directories:

```cmake
install(TARGETS maelstrom_node
    EXPORT maelstrom_nodeConfig
    ARCHIVE DESTINATION lib
    LIBRARY DESTINATION lib
    RUNTIME DESTINATION bin
)

install(DIRECTORY ${CMAKE_SOURCE_DIR}/include/maelstrom-node
    DESTINATION include/maelstrom-node
)
```

This setup ensures the maelstrom-node library is compiled correctly and packaged in a way that makes it easy to integrate into other projects. While CMake offers much flexibility, its verbosity and reliance on external tools like vcpkg highlight some of its limitations in managing dependencies efficiently. CMake provides multiple approaches to configure and build the project. Ideally, you could use a preset configuration for simplicity, such as (based on the official documentation):

```bash
cmake --preset=vcpkg
cmake --build build
```

This approach is clean and convenient, leveraging a preset defined in `CMakePresets.json`. However, due to a [defect in Visual Studio Code’s CMake Tools](https://stackoverflow.com/questions/78046929/cannot-use-environment-variable-in-cmakepresets-json-with-cmaketools-in-vscode-t), environment variables like `$VCPKG_ROOT` cannot be directly used in `CMakePresets.json`. As a result, the preset may fail to locate the toolchain file correctly.

To address this issue, the following manual configuration proves reliable despite its ugliness:

```bash
cmake -S . -B build -DCMAKE_TOOLCHAIN_FILE=$VCPKG_ROOT/scripts/buildsystems/vcpkg.cmake
cmake --build build
```

Both methods ultimately lead to the same result, but the manual approach is necessary in environments where preset limitations or toolchain file paths are not resolved automatically. This highlights a minor inconvenience in the CMake ecosystem that can complicate workflows when integrating with tools like vcpkg.

## Let's integrate it!

Let’s integrate maelstrom-node into our application! This is the final step to bring everything together, and it’s where the differences between Bazel and CMake really stand out in terms of setup, dependency management, and usability. Here’s how each approach handles this critical task.

### Bazel Integration

In Bazel, the integration is streamlined by declaring the maelstrom-node library as a dependency using `bazel_dep` and providing a `git_override` to fetch the library from its repository:

```python
bazel_dep(name = "maelstrom_node", version = "1.0.0")
git_override(
    module_name = "maelstrom_node",
    commit = "004b1d793427838db32d5e175f1f474bec260766",
    remote = "https://github.com/astavonin/maelstrom-node.git",
)
```

The library is then added as a dependency in the build rule for the application:

```python
cc_binary(
    name = "echo-cpp",
    srcs = [
        "main.cpp",
    ],
    copts = [
        "-std=c++23",
    ],
    visibility = ["//visibility:public"],
    deps = [
        "@maelstrom_node",
        "@spdlog",
    ],
)
```

Bazel’s approach to dependencies is more declarative and centralized. Dependencies are fetched and managed globally at the repository level, ensuring consistency across the project. The use of `bazel_dep` and overrides simplifies versioning, and Bazel’s caching mechanism avoids redundant downloads and builds, leading to faster iterations.

The compilation process is still very straightforward for the final app:

```bash
bazel build //...
```

### CMake Integration

The CMakeLists.txt file for the integration is relatively standard, with one notable addition: the use of `FetchContent` to fetch and include the maelstrom-node library directly from its Git repository. This setup is straightforward, as shown below.

```cmake
include(FetchContent)

FetchContent_Declare(
    maelstrom_node
    GIT_REPOSITORY https://github.com/astavonin/maelstrom-node.git
    GIT_TAG v1.0.0
)

FetchContent_MakeAvailable(maelstrom_node)
```

This snippet looks pretty and allows the library to be built alongside the application. But, it’s not without its drawbacks. Unlike Bazel, CMake relies heavily on external tools like vcpkg for dependency management. Unfortunately, vcpkg requires a complete list of dependencies to be declared for every project (is it a defect? It looks so to me.). In this case, both echo-cpp and maelstrom-node must redundantly list their dependencies in echo-cpp’s vcpkg.conf file. This duplication can be tedious and error-prone, especially in larger, more complex projects.

Another significant limitation is CMake’s lack of integration with other ecosystems like Rust and Cargo. If you already have existing integration tests written in Rust, as I have, CMake cannot reuse them natively. This inability to leverage cross-language infrastructure is one of CMake’s most significant downsides and a stark contrast to Bazel, which excels in mixed-language project support.

While this integration approach works, it highlights the challenges of relying on CMake for projects beyond simple use cases, especially when dealing with multiple dependencies or mixed-language ecosystems.