---
title: "Dealing with ThreadSanitizer Fails on Startup"
date: 2025-12-05
categories:
  - C++
  - Docker
  - CI
  - DevOps
  - Tooling
---

<figure style="float: left; width: 300px; margin: 0 1em 1em 0;" markdown>
  <a href="https://sysdev.me/img/pi_crab.png" target="_blank">
    <img src="https://sysdev.me/img/pi_crab.png" alt="" width="250">
  </a>
</figure>

Usually, you need just a few lines to initialize TSan in your project: you compile with the sanitizer flags, run the tests, and get a clear report of which threads touched which memory locations. On a modern Linux system, that simple expectation can fail in a very non-obvious way.

```
FATAL: ThreadSanitizer: unexpected memory mapping 0x...
```

In my case, I attached TSan to a not-so-young C++ codebase and immediately encountered a fatal runtime error from the sanitizer, long before any of the project's code executed. No race report, no helpful stack trace, just a hard abort complaining about an "unexpected memory mapping."

If you can upgrade your toolchain to LLVM 18.1 or newer, this problem effectively disappears, because newer TSan builds know how to recover from the incompatible memory layout. Suppose you are pinned to an older LLVM (by CI images, production constraints, or corporate distro policy). In that case, you are in the same situation I was: you have to understand what the sanitizer is trying to do with the address space, and work around the failure mode yourself.

<!-- more -->

The process terminates in its initialization phase, long before your program's logic executes. The failure stems from changes to Linux's memory-layout randomization and from assumptions baked into TSan's address-space model. At the end, it was not as complicated an issue as I initially thought, and it was interesting to dig a bit.

## A Minimal Possible Example

To keep the demonstration as small as possible, let's make a deliberately naive example: multiple threads increment a shared global integer with no synchronization of any kind. We ignore atomics, mutexes, and every correctness rule you would normally apply.

```cpp
int shared_counter = 0;

void increment_counter(int thread_id, int iterations) {
    for (int i = 0; i < iterations; ++i) {
        int old_value = shared_counter;
        shared_counter = old_value + 1;
    }
}
```

Any sanitizer-enabled build should report concurrent accesses to shared_counter, show at least two stacks, and explain that the update is non-atomic. Compiling with Clang and ThreadSanitizer is straightforward.

!!! note
    And one note upfront: if you build this locally with an LLVM toolchain newer than 18.1, you may not see the failure at all. Modern TSan versions recover automatically by re-executing the process with a compatible memory layout, so the crash only appears when using older LLVM releases.

```bash
clang++ -std=c++17 -g -Wall \
    -fsanitize=thread -fno-omit-frame-pointer \
    -o simple_test simple_test.cpp
```

On older Linux distributions you get a standard TSan report. On newer environments TSan may crash before producing any output.

