---
title: "Fixing C++ lacks switches on strings"
date: 2025-02-17
categories:
  - C++
  - Optimizations
  - Job Notes
---

<figure style="float: left; width: 300px; margin: 0 1em 1em 0;" markdown>
  <a href="https://sysdev.me/img/Birch-Grove.jpeg" target="_blank">
    <img src="https://sysdev.me/img/Birch-Grove.jpeg" alt="caption" width="250">
  </a>
  <figcaption>
    Birch Grove is just 40 minutes from Bishkek. Although I was concerned about the strong, foggy weather, it was an amazing opportunity for photography!
  </figcaption>
</figure>

C++ is a powerful language, and I genuinely love it, but sometimes, even in modern versions, it lacks some surprisingly simple features. One such missing feature is switch on `std::string`. You’d think that by now, we could use a switch statement on strings just like we do with integers or enums—after all, Go has it! But no, C++ keeps us on our toes.

Why Doesn’t C++ Support switch on strings? Because "you only pay for what you use," which is the standard C++ mantra. The switch statement in C++ relies on integral types. Under the hood, it works by converting the case values into jump table indices for efficient execution. But `std::string` (or even `std::string_view`) is not an integral type—it’s a more complex data structure. That’s why you can’t simply do:

```cpp
switch (msg->get_value<std::string>()) { // Nope, not possible :-(
    case "topology":
        // Handle network topology
        break;
    case "broadcast":
        // Handle network broadcast
        break;
}
```
<!-- more -->
So… how do we work around this? We need a way to turn strings into something `switch` can handle—like an integer. And that’s where hashing comes in. If we can map strings to unique integer values at compile time, we can switch on those instead. To do so, we need a user-defined `literal operator` and compile-time hash function. Something like this:

```cpp
constexpr uint64_t hash(std::string_view str) {
    uint64_t hash = 0;
    for (char chr : str) {
        hash = (hash * 131) + chr;
    }
    return hash;
}

constexpr uint64_t operator"" _hash(const char* str, size_t len) {
    return hash(std::string_view(str, len));
}
```

And, no magic, we have `switch` on strings!

```cpp
switch (hash(msg->get_value<mf::data_type>())) {
    case "topology"_hash: {
        // Handle topology case
        break;
    }
    case "broadcast"_hash: {
        // Handle broadcast case
        break;
    }
    default:
        // Handle unknown case
        break;
}
```

There are some downsides to using this approach, specifically regarding hash collisions. Hashing introduces a small, but non-zero, risk of collisions. The proposed hash function, which multiplies the current hash by 131 and adds each character, is sufficiently effective for this use case. It provides a fast, compile-time method to map short, distinct string literals to unique integer values.

The choice of 131 as a multiplier contributes to achieving a reasonable distribution of values, thus reducing the likelihood of collisions, especially for a limited set of keywords like "topology," "broadcast," and others. The number 131 is commonly used in simple hash functions because it is a prime number. This helps to spread out the hash values more evenly across the available space, minimizing clustering and improving distribution properties. Additionally, it is small enough to maintain fast calculations while ensuring sufficient entropy accumulation over short strings.

Since the hash is computed at compile-time (using `constexpr`), there is no runtime overhead, and the resulting integer comparisons in switch statements remain **O(1)**. This makes this approach both efficient and practical for situations involving a limited number of predefined strings. Furthermore, the risk of hash collisions is exceedingly low for a small number of strings. Using the Birthday Problem approximation, we can estimate that even with 1,000 unique strings, the collision probability remains below 0.000003%, making it practically irrelevant for most real-world applications where a switch statement would be used.

It’s ridiculous that in 2025, we still have to hack our way around something as basic as `switch` on strings in C++. But on the bright side, this was a perfect excuse to use a user-defined `literal (operator"")` finally! It’s one of those C++ features you rarely use, but it feels like a wizard when you do.