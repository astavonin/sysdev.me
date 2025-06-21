---
title: "Functional Programming style in C++"
date: 2025-06-22
draft: true
categories:
  - C++
  - Elixir
  - LeetCode
---

<figure style="float: left; width: 300px; margin: 0 1em 1em 0;" markdown>
  <a href="https://sysdev.me/wp-content/uploads/2025/02/Birch-Grove.jpeg" target="_blank">
    <img src="https://sysdev.me/wp-content/uploads/2025/02/Birch-Grove.jpeg" alt="caption" width="250">
  </a>
  <figcaption>
    Birch Grove is just 40 minutes from Bishkek. Although I was concerned about the strong, foggy weather, it was an amazing opportunity for photography!
  </figcaption>
</figure>

I’ve been on a bit of a Leetcode streak lately, poking at problems from companies I secretly admire. To keep things interesting (and to avoid nodding off in front of the screen), I challenged myself to solve the same task three ways: good old C++, its shiny modern C++20 cousin, and Elixir. It turns out that staring at a problem through a functional programming lens is like putting on X-ray specs—you see the same lines of code, but suddenly, there’s a weird beauty in that filter chain.</p>

My first pass was as traditional as it gets—a simple C++ class with a std::vector and a loop. No magic here, just pushing timestamps and scanning them one by one. The implementation is pretty naive, but considering the provided constraints from the [Design a hit counter](https://leetcode.com/problems/design-hit-counter) challenge, even an unscalable approach is acceptable. So, we will push all new timestamsp into the ~~`queue`~~ `vector` and then simply count.

```cpp
class HitCounter {
    std::vector&lt;int> timestamps_;
    static constexpr int HITS_PERIOD = 300;
public:
    HitCounter() {
        timestamps_.reserve(300);
    }
    
    void hit(int timestamp) {
        timestamps_.push_back(timestamp);
    }
    
    int getHits(int timestamp) {
        int res = 0;
        int delta = timestamp - HITS_PERIOD;

        for(auto it=timestamps_.begin(); it &lt;= timestamps_.end(); it++) {
            if(*it > timestamp) {
                break;
            }
            if(*it > delta) {
                res++;
            }
        }
        return res;
    }
};
```

And, yes, this solution is completely compliant with the requirements and passes all tests. But it's really ugly, isn't it?
<!-- more -->
Next up was the Elixir version, where I leaned on an Agent to hold my list of timestamps. Elixir doesn’t let you mutate global state willy-nilly, so I spun up a small process to mind that list for me. Here’s the gist: