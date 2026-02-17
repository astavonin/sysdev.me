---
title: "IPO Season and the Death of Software Engineering (Again)"
date: 2026-02-12
categories:
  - Industry Analysis
  - Engineering Career
  - Economics
---

<figure style="float: left; width: 300px; margin: 0 1em 1em 0;" markdown>
  <a href="https://sysdev.me/img/song-kol-camp.JPG" target="_blank">
    <img src="https://sysdev.me/img/song-kol-camp.JPG" alt="" width="250">
  </a>
  <figcaption>
    Our Perseids campsite at Song Kol. No cell signal, no Blind, no LinkedIn panic.
  </figcaption>
</figure>

I check Blind the way some people check horoscopes: every morning, expecting drama, occasionally finding truth. The Economist I read for the opposite reason, it's calm, structured, backed by actual data. These two don't usually agree on much. But over the past couple of months, they've converged on the same narrative, and that's when I start paying attention.

## December 2025: the quiet IPO prep

Most people missed the December signal. No press conference, no earnings call. Just a Schumpeter column in The Economist[^1] noting that SpaceX, OpenAI, and Anthropic are all circling public listings. Anthropic hired Wilson Sonsini, the firm that took Google and LinkedIn public. Valuation tripled in six months to $183 billion[^2]. Revenue reportedly went up ninefold in a year[^3].

<!-- more -->

None of this was loud. But if you've watched companies prepare for IPOs before, you recognize the choreography. Legal team locked in. Valuation inflating fast. Private rounds getting so large they start to look absurd. OpenAI's last was $40 billion, bigger than most IPOs in history.

The Economist asked the right question: will more capital trump more scrutiny? Public markets are a different audience than a handful of VCs fighting for allocation. They want a story that justifies tenfold valuation growth in two years. That story showed up in January.

## January 2026: the bold claim

Dario Amodei sat down with Zanny Minton Beddoes at the World Economic Forum in Davos and said what every IPO roadshow needs to hear[^4]. "We might be six to twelve months away from when the model is doing most, maybe all of what SWEs do end to end." He added that engineers within Anthropic already don't write code anymore, they just let the model generate it and then edit the output.

That's a hell of a statement from the CEO of a company actively preparing for one of the largest IPOs in American history.

I've watched this exact script play out before. At Motional, the AV pitch was always the same: full autonomy is right around the corner. The only difference between then and now is the buzzword. Back then the investor story was "human drivers are obsolete." Today it's "human engineers are obsolete." Both claims share one feature: they're calibrated for capital markets, not engineering reality. At Motional, we believed the timeline enough to staff for it. Then we cut 40 percent of engineering when reality didn't cooperate.

Saying "AI is a useful tool that makes engineers 30 percent more productive" doesn't get you to a $350 billion valuation. Saying "software engineering is about to be obsolete" does. It implies total market capture, minimal future labor costs, exponential returns. Whether it's true is almost beside the point for the roadshow.

## February 2026: the panic

And then, right on schedule, LinkedIn lit up. "We're all dead." "Software engineering is over." "Time to learn plumbing." The usual cycle. Every major tech publication ran a variation of the story. Zoho's founder Sridhar Vembu posted on X advising developers to consider alternative livelihoods. I've seen this exact reaction pattern play out at least three times in my career (yeah, it looks like I'm old :-D), each time with a different buzzword. Cloud was going to kill ops. Low-code was going to kill developers. Autonomous vehicles were going to wipe out the entire transportation workforce within five years. The panic always sounds the same, and it always serves someone's fundraising timeline.

## Also February 2026: the Blind reality

While LinkedIn was running eulogies, Blind had something more interesting. A post about OpenAI's hiring freeze[^7]: rumors of drastically reduced headcount, people stuck in the reference stage, roles going quiet. Not the dramatic AI-replaces-everyone narrative. Just the mundane, familiar silence of a company that stopped calling candidates back.

Sam Altman had said at a developer town hall in late January that OpenAI plans to "dramatically slow down" hiring[^5]. AI lets them do more with fewer people, he explained. Careful phrasing: not a freeze, not a layoff, just "hiring more slowly." Blind didn't buy the distinction.

So one CEO says engineering is becoming obsolete. The other says he needs fewer engineers. And both companies are hemorrhaging money. OpenAI is projected to lose around $12 billion this year. The Economist noted they expect to burn through another $115 billion before profitability around 2030[^1]. Anthropic might break even a couple of years earlier. Might.

If your AI is truly replacing engineers, your costs should be going down. They aren't.

## What the data says

I covered this in detail in my earlier piece on what actually drove the tech layoffs[^6], and the short version hasn't changed: even after all the cuts, Meta and Google employ 50 to 65 percent more people than they did in 2019. Spending per engineer went up, not down. The pandemic hiring bubble created the correction. AI was the convenient scapegoat.

Ask yourself: if you were preparing to take a company public at a $350 billion valuation, would you keep hiring at pandemic-era rates? Of course not. You'd slow down, tighten the numbers, show Wall Street that you run a disciplined operation. That's what's happening. The AI angle is a press release. The hiring freeze is an accounting decision.

## Where this actually lands

I use AI tools every day. Genuinely useful. Claude Code alone is reportedly a $1 billion a year product for Anthropic[^3], and I understand why.

That said. I once spent six hours debugging a video pipeline that produced garbage output on a single device out of twelve. The root cause: a thermal throttle changed the encoder bitrate, and a downstream component written by a different team assumed constant bitrate and silently dropped frames. One-line fix. Six hours of staring at thermal logs and corrupt H.264 frames to get there. Try putting that in a prompt when you don't know the problem yet.

"AI writes boilerplate faster" is real. "Engineering is obsolete" is an IPO story. The AV industry promised my car would drive itself by now. Still holding the steering wheel.

[^1]: [The Economist, "SpaceX, OpenAI, Anthropic and their giga-IPO dreams." December 16, 2025.](https://www.economist.com/business/2025/12/16/spacex-openai-anthropic-and-their-giga-ipo-dreams)
[^2]: [Anthropic IPO preparations. Financial Times via Reuters, December 2, 2025.](https://money.usnews.com/investing/news/articles/2025-12-02/anthropic-plans-an-ipo-as-early-as-2026-ft-reports)
[^3]: [Anthropic revenue and valuation data. Sacra.](https://sacra.com/c/anthropic/)
[^4]: [Dario Amodei at Davos. Interview with Zanny Minton Beddoes, World Economic Forum, January 20, 2026.](https://www.entrepreneur.com/business-news/ai-ceo-says-software-engineers-could-be-replaced-in-months/502087)
[^5]: [OpenAI hiring slowdown. Sam Altman at developer town hall, January 27, 2026.](https://futurism.com/artificial-intelligence/sam-altman-openai-slashing-hiring)
[^6]: [What Actually Drove the Tech Layoffs. My earlier analysis.](https://sysdev.me/what-actually-drove-the-tech-layoffs/)
[^7]: [OpenAI hiring freeze. Blind post.](https://www.teamblind.com/us/s/0sd7ef8k)
