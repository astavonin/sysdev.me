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
  <a href="https://sysdev.me/img/Shamshy.jpeg" target="_blank">
    <img src="https://sysdev.me/img/Shamshy.jpeg" alt="" width="250">
  </a>
  <figcaption>
	A typical iconic Kyrgyzstan view.
  </figcaption>
</figure>

Usually, you need just a few lines to initialize TSan in your project: you compile with the sanitizer flags, run the tests, and get a clear report of which threads touched which memory locations. On a modern Linux system, that simple expectation can fail in a very non-obvious way.

```
FATAL: ThreadSanitizer: unexpected memory mapping 0x...
```

In my case, I attached TSan to a not-so-young C++ codebase and immediately encountered a fatal runtime error from the sanitizer, long before any of the project's code executed. No race report, no helpful stack trace, just a hard abort complaining about an "unexpected memory mapping."

If you can upgrade your toolchain to LLVM 18.1 or newer, this problem effectively disappears, because newer TSan builds know how to recover from the incompatible memory layout. Suppose you are pinned to an older LLVM (by CI images, production constraints, or corporate distro policy). In that case, you are in the same situation I was: you have to understand what the sanitizer is trying to do with the address space, and work around the failure mode yourself.

<!-- more -->

The process terminates in its initialization phase, long before your program's logic executes. The failure stems from changes to Linux's memory-layout randomization and from assumptions baked into TSan's address-space model. At the end, it was not as complicated[^1] an issue as I initially thought, and it was interesting to dig a bit.

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
    And one note upfront: if you build this locally with an LLVM toolchain newer than 18.1, you may not see the failure at all. Modern TSan versions recover automatically by re-executing the process with a compatible memory layout, so the crash only appears when using older LLVM releases. For experiments I [made a project](https://github.com/astavonin/tsan_aslr_demo) with LLCV-14 installed that uses Docker to provide builds with reproducible issues.

```bash
clang++ -std=c++17 -g -Wall \
    -fsanitize=thread -fno-omit-frame-pointer \
    -o simple_test simple_test.cpp
```

On older Linux distributions, you get a standard TSan report. In newer environments, TSan may crash before producing any output.

## Will non-PIE Binaries Help?

Typically, GCC/LLVM generates Position Independent Executables (PIE) by default. From the loader's perspective, a PIE binary behaves like a shared object: it can be mapped at any randomized base address. A non-PIE binary (ET_EXEC) has a static image layout, and the loader only applies relocations around fixed segments. TSan's shadow memory model behaves differently depending on which form you use.

First of all, we need to build two variants:

```
# PIE build
clang++ -std=c++17 -g -Wall \
    -fsanitize=thread -o simple_test_pie simple_test.cpp

# non-PIE build
clang++ -std=c++17 -g -Wall \
    -fsanitize=thread -fno-PIE -no-pie \
    -o simple_test_nopie simple_test.cpp
```

On systems with high memory randomization, the PIE variant usually fails first because its relocation window is more likely to overlap with TSan's expected shadow ranges. The non-PIE build can also fail, but slightly less frequently. So, this is also not a solution, even though I initially thought it was the cause.

## What Actually Goes Wrong: TSan’s Shadow Memory Layout

ThreadSanitizer maps every real address to a shadow address. It doesn’t do this on demand for each page. It wants large, fixed chunks of the address space reserved up front for its metadata: access histories, timestamps, and everything else it needs to track races. The layout for x86_64 was designed at a time when Linux used much lower ASLR ranges, and the sanitizer relied on that space being predictable.
You can check how much randomness your kernel uses with:

```bash
sud o cat /proc/sys/vm/mmap_rnd_bits
```

Typical value on modern Linux is 32. Older kernels stayed around 28 to 30. Bumping it to 32 simply widens the area where the kernel can drop anonymous mappings, shared libraries, JIT code, or loader segments. With that extra room, the chance that one of those mappings lands in the region TSan wants for its shadow space goes up noticeably.

When that happens, the sequence is boringly predictable:

1. The loader picks a random high address for a library or for the binary itself.
2. TSan starts up and asks for its shadow memory slice.
3. That slice is already occupied.
4. Older TSan doesn’t try to recover. It just aborts immediately.

## Disabling ASLR for the Test Process

It's possible to disable ASLR for the whole system, but it does not look like a good idea. It will weaken the security posture of the host, which is usually unacceptable. Fortunately, Linux allows individual processes to run with ASLR off via the `ADDR_NO_RANDOMIZE` personality flag. The simplest interface is `setarch`:

```bash
setarch $(uname -m) -R ./simple_test_nopie
```

The command launches the child process with randomized layout disabled while leaving the system configuration intact. With deterministic placement restored, TSan can reserve its shadow memory and run normally. This was sufficient for me for local development and CI pipelines that run dynamic analysis tools.

## But What is about Docker?

Here comes the tricky part. Containers don’t get their own ASLR policy; they just reuse whatever the host is doing. And most CI images run with Docker’s default seccomp profile, which blocks a bunch of syscalls, including personality(). Since setarch depends on that syscall, it simply can’t flip the ASLR flag inside the container, so the call fails with an error.

```
setarch: failed to set personality to x86_64: Operation not permitted
```

Relaxing the container’s `seccomp` configuration solves the problem:

```bash
docker run --security-opt seccomp=unconfined ...
```

Once the sandbox permits `personality()`, you can run your sanitizer-instrumented binary via `setarch -R` inside the container with the same behavior you observe on a host.

If you want a more selective policy, you can create a custom `seccomp` file that mirrors Docker’s defaults but allows `personality`. This avoids granting full `syscall` access to the container while still enabling TSan.

## Why Upgrading the Toolchain Solves the Problem

LLVM 18.1 changes how TSan handles bad luck with the address layout. When it sees that the current mappings collide with what it needs, it doesn’t give up anymore. Instead, it quietly re-executes the process with ASLR turned off just for that run. The sanitizer gets a layout it can work with, and from the outside the program simply starts normally.

With LLVM 18.1 or newer, you don’t need setarch, you don’t need to relax seccomp in Docker, and you don’t need to switch to non-PIE builds. The newer runtime handles the mismatch on its own and avoids the crashes that show up on older toolchains.


[^1]:
    Original issue discussion on GitHub: [Thread Sanitizer FATAL error on kernel version 6.6.6-x](https://github.com/google/sanitizers/issues/1716).
