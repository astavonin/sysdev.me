---
title: "Functional Programming style in C++"
date: 2025-06-21
categories:
  - C++
  - Elixir
  - LeetCode
---

<figure style="float: left; width: 300px; margin: 0 1em 1em 0;" markdown>
  <a href="https://sysdev.me/img/Teskey-Torpok_Pass.jpg" target="_blank">
    <img src="https://sysdev.me/img/Teskey-Torpok_Pass.jpg" alt="caption" width="250">
  </a>
  <figcaption>
    Teskey-Torpok Pass is a lovely pass leading you to Song-Kol Lake, Naryn region.
  </figcaption>
</figure>

I’ve been on a bit of a Leetcode streak lately, poking at problems from companies I secretly admire. To keep things interesting (and to avoid nodding off in front of the screen), I challenged myself to solve the same task three ways: good old C++, its shiny modern C++20 cousin, and Elixir. It turns out that staring at a problem through a functional programming lens is like putting on X-ray specs—you see the same lines of code, but suddenly, there’s a weird beauty in that filter chain.<

My first pass was as traditional as it gets—a simple C++ class with an array and a loop. No magic here, just pushing timestamps and scanning them one by one. The implementation is pretty naive, but considering the constraints provided by the [Design a hit counter](https://leetcode.com/problems/design-hit-counter) challenge, even an unscalable approach is acceptable. So, we will push all new timestamps into the ~~`std::queue`~~ `std::vector` and then simply count.
<!-- more -->
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

And, yes, this solution is completely compliant with the requirements and passes all tests. But it's hideous, isn't it?

Next up was the Elixir version, where I leaned on an `Agent` to hold my list of timestamps. Elixir doesn’t let you mutate global state willy-nilly, so I spun up a small process to mind that list for me. Here’s the gist:

```elixir
defmodule HitCounter do
  @hits_period 300
  @agent_name __MODULE__

  @spec init_() :: :ok | {:error, any}
  def init_() do
    if Process.whereis(@agent_name) do
      Agent.stop(@agent_name)
    end

    Agent.start_link(fn -> [] end, name: @agent_name)
    |> case do
      {:ok, _pid} -> :ok
      error -> error
    end
  end

  @spec hit(timestamp :: integer) :: :ok
  def hit(timestamp) when is_integer(timestamp) do
    Agent.update(@agent_name, fn timestamps -> timestamps ++ [timestamp] end)
  end

  @spec get_hits(timestamp :: integer) :: integer
  def get_hits(timestamp) when is_integer(timestamp) do
    lower_bound = timestamp - @hits_period

    Agent.get(@agent_name, fn timestamps ->
      timestamps
      |> Stream.take_while(fn ts -> ts <= timestamp end)
      |> Stream.filter(fn ts -> ts > lower_bound end)
      |> Enum.count()
    end)
  end
end
```

Why an `Agent`? Because each test run in Leetcode’s harness executes sequentially without dropping your module’s state. If you don’t stop the Agent on `init_/0`, you end up with phantom hits from previous tests—state leaks faster than coffee through a paper filter. I guarantee a clean slate every time by explicitly stopping any existing Agent before starting fresh.

Finally, I couldn’t resist a modern C++ take using C++20 `ranges` and `views`. No loops, no manual counters—just a pipeline that reads like a little poem:

```cpp
int getHits(int timestamp) {
    int delta = timestamp - HITS_PERIOD;

    return std::ranges::distance(
        timestamps_
        | std::views::take_while([=](int ts) {
            return ts <= timestamp; // stop processing beyond this point
        })
        | std::views::filter([=](int ts) {
            return ts > delta;
        })
    );
}
```

It’s concise, lazy, and stops early once hits exceed the current timestamp—exactly mirroring our original loop logic. Feels a bit like writing haiku in code: short lines, precise meaning, and a dash of Zen.

Mixing paradigms this way has been surprisingly refreshing. You refactor the same logic through different lenses and discover nuances you’d never notice if you stuck to one language. Plus, it’s way more entertaining than another unadorned C++ loop.
