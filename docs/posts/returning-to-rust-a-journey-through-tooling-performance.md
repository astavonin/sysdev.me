---
title: "Returning to Rust: A Journey Through Tooling, Performance"
date: 2024-12-10
categories:
  - Software Engineering
  - Tooling
tags:
  - Rust
  - C++
  - Bazel
  - CMake
  - Go
---

[When I started tackling](https://github.com/astavonin/maelstrom-challenges) the [Maelstrom challenges](https://github.com/jepsen-io/maelstrom/tree/main), my initial thought was to use C++. It’s a language I know inside out, and its performance is hard to beat. However, as I contemplated setting up the project, I realized I couldn’t justify fighting with the C++ pipeline for free. Crafting a proper CMake or Bazel configuration might be worthwhile for large-scale projects or when compensated, but for personal experiments? It’s an unnecessary headache.

## Why Go is My Default Choice

For most non-performance critical scenarios, Go is my default, no-brainer choice. It has a clean build system, excellent tooling, and a developer experience that doesn’t make me dread the setup process. Go’s simplicity allows me (and **any** level team) to focus on solving the problem rather than wrestling with the environment. Yet, this time, I decided to take a different path.

<!-- more -->

## Revisiting Rust

My relationship with Rust has been a journey of highs and lows. I was initially drawn to it during its early days, around Rust 0.1, when the language was brimming with potential. What captivated me back then was its promise to be a kind of “Erlang on steroids”—a language that combined Erlang's lightweight concurrency model and fault-tolerant programming paradigms with the performance and control of a systems language.

Unfortunately, with the release of Rust 1.0, much of that original vision shifted. Green threads—a key feature that enabled lightweight concurrency and aligned closely with the “Erlang on steroids” dream—were abandoned. The decision to remove them in favor of direct integration with the OS threading model made sense for speeding up the 1.0 release. Still, it marked a significant departure from the language’s earlier aspirations.

Adding to the change was a complete overhaul of Rust’s memory model, which moved toward its now-iconic ownership system. While the new model introduced unparalleled safety and performance guarantees, it also made the language more complex and less approachable, particularly for those who were excited about its initial simplicity.

These shifts left me feeling that Rust had transformed into “just another overcomplicated C++-like language,” albeit with better safety features and tooling. Over time, I moved away from Rust, drawn instead to more straightforward and developer-friendly languages for most of my work.

But now, years later, I’m giving Rust another shot while having plenty of free time. Its strong presence in emerging fields like Web3 has made it impossible to ignore. The language has clearly matured, and while its evolution may not have aligned with my initial hopes, I’m curious to explore how its modern ecosystem can contribute to my work. Rust may no longer be the “Erlang on steroids” I once envisioned, but it’s carving out a unique space for itself, and I’m eager to see how it fits into my technical journey moving forward.

### Comparing Tooling and Developer Experience

My return to Rust brought some pleasant surprises—and a few frustrations. Here’s a breakdown of my observations:

Cargo vs. Build Systems

* Cargo, Rust’s build system and package manager, is undeniably better than CMake—but then again, that’s not a high bar. Let’s be honest: CMake is an exercise of frustration for most developers.
* Comparing Cargo to Bazel: Cargo feels more straightforward and approachable, but it requires more power and flexibility than Bazel. In that sense, Bazel is still the gold standard for me in large, complex projects.
* Go’s build system, however, remains my favorite. Its simplicity and convention-over-configuration philosophy are unmatched.

### IDEs and Editor Support

Tools like RustRover have evolved to deliver an exceptional development experience, far surpassing the likes of CLion or most other C++ IDEs. The level of integration with Cargo, code analysis, and developer assistance is simply stellar.

### Compiler Diagnostics

One of Rust’s standout features is its compiler diagnostics. The clarity and detail in Rust’s error messages are leagues ahead of what you get with ***Clang*** or ***GCC***. It’s an area where Rust truly shines, making debugging and iteration smoother. However, it’s not all perfect.

When it comes to **borrowing-related errors**, the story changes. These errors often feel nonintuitive, even for developers familiar with Rust’s ownership model. Despite the compiler’s best efforts to provide explanations, deciphering and resolving these errors frequently requires external help. You’ll find yourself Googling extensively or turning to tools like ChatGPT (model 4.0 preferred) to figure out what’s going wrong and how to fix it. This aspect of the Rust learning curve remains a significant hurdle for newcomers and a source of frustration even for experienced developers.

While the error diagnostics are still better than those offered by C++, the borrowing system’s complexity can sometimes undermine the excellent developer experience.

## Reflections and Future Plans

Sometimes, stepping back into an ecosystem with a fresh perspective can reveal how much has changed—for better or worse. Rust is no longer just the “overcomplicated” C++ sibling I left behind. It’s still a language with comparable complexity to C++ (which means it's overcomplicated) but with a critical difference: compile-time sanitizers you need in C++ baked into its Rust core. This feature transforms those complexities into tools that actively guide you toward safer, more robust code.
Last but not least, as I'd mentioned above, I do not want to setup a proper C++ pipeline either :-D