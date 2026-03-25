---
title: "Vibe Coding experiment"
date: 2026-03-25
categories:
  - AI
  - Tooling
  - Processes
---

<figure style="float: left; width: 300px; margin: 0 1em 1em 0;" markdown>
  <a href="https://sysdev.me/img/vibe-coding-experiment.png" target="_blank">
    <img src="https://sysdev.me/img/vibe-coding-experiment.png" alt="" width="250">
  </a>
</figure>

A bit more interesting data on vibe-coding vs structured assistant-coding.

Yesterday I ran an experiment. Had a task that will never touch production (local utility), and I'd been reading yet another piece about some engineer cranking out 10 MRs per day with AI. Good enough reason to actually try the dump-everything-at-once approach.

So I described the full scope to Claude upfront and let it run. Two things stood out. It took longer and produced more frustrating dead ends than my usual flow (detailed design first, then feature-by-feature implementation[^1]). And it burned roughly twice the tokens compared to the structured approach. March 24 alone hit $35 after a session involving all three models, versus $10 on a more focused day. If you want to track your own numbers, `npx ccusage@latest` does the job.

I've seen the "feed it the whole task at once" question pop up a lot lately. Based on this, my answer is: don't. At least not yet. The model doesn't have the context to make the right trade-offs upfront, and you end up steering it through corrections that a proper design phase would have avoided entirely. And if you think vibe-coded output is going into a proper review pipeline, that's a separate problem[^2].

Vibe-coding makes for great demos. In practice, it's just paying more for worse results.

[^1]: [Development processes in the GenAI era. sysdev.me, January 2026.](https://sysdev.me/2026/01/14/development-processes-in-the-genai-era/)
[^2]: [Making GenAI code review actually useful. sysdev.me, February 2026.](https://sysdev.me/2026/02/19/making-genai-code-review-actually-useful/)
