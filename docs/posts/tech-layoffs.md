---
title: "What Actually Drove the Tech Layoffs"
date: 2025-11-20
categories:
  - Industry Analysis
  - Engineering Career
  - Economics
---

<figure style="float: left; width: 300px; margin: 0 1em 1em 0;" markdown>
  <a href="https://sysdev.me/img/chon-aryk-hills.jpeg" target="_blank">
    <img src="https://sysdev.me/img/chon-aryk-hills.jpeg" alt="" width="250">
  </a>
  <figcaption>
	A 10-minute ride and you have such a view from Chon Aryk hills.
  </figcaption>
</figure>

I truly enjoy reading Blind and Levels. There is so much internal drama, messy details, and unexpected insights that you almost do not need reality shows anymore. And if you ever feel bored, you can always drop a mildly toxic comment into a thread and watch the whole thing ignite. It fits the overall style of Blind a little too well, but that is part of the fun. And considering that mix of casual toxicity and surprisingly rational takes you see there, you would expect people to look at layoffs with a bit more perspective. But when the topic comes up, the conversation usually drifts to the same explanation. People blame AI. People say their jobs vanished because a model wrote some code. And while I understand the frustration, the logic never sits right with me. Nobody complained during the hiring boom of 2020 and 2021, when companies doubled their headcount like it was nothing. That part gets forgotten. Now that the correction is here, many want a simple villain. AI fits the story, but it does not fit the data.

<!-- more -->
I have seen this pattern before. Back at Motional we were deep in the autonomous vehicle race. That industry grew on promises we could not keep, and considering what I know about the AV domain today, those promises were never possible in the first place. For years the message to investors was that full self driving was right around the corner. We hired fast and built big. Then reality caught up. Cruise paused its operations. Argo AI shut down. Uber ATG was sold. Zoox cut teams after delays. Pony.ai struggled with regulations. And inside Motional we cut about 40 percent of engineering in a single move, after several smaller rounds. It was painful, but it made sense once you looked past the hype. We hired for a future that had not arrived.

Big tech did something similar. When the pandemic hit and the world moved online, demand exploded. Companies assumed that surge was permanent. They hired for a future where remote work and digital services would keep climbing forever. Then the world shifted back to normal, the economy cooled, and interest rates went up. Suddenly those oversized teams were hard to justify. The layoffs that followed were not about engineers losing relevance. They were about companies correcting unrealistic growth curves.

## Headcount is still way above pre pandemic levels

Even after layoffs, Meta, Google, and Netflix remain much larger than they were before COVID. The numbers make this very clear.

| Company | Employees 2019 | Employees 2024 | Growth |
|---------|----------------|----------------|--------|
| Meta | 44,942 | 74,067 | +65 percent |
| Google (Alphabet) | 118,899 | 183,323 | +54 percent |

If AI replaced engineers at scale, we would see headcounts dropping below 2019 levels. That did not happen. Tech firms grew fast, then trimmed the excess.

## Companies spend more money per engineer than before

Now look at what each company spends on its engineering and research efforts. To compare across years, I used a simple method. Assume that about thirty percent of the workforce is engineering and use R&D or a similar cost as a proxy for engineering investment. It is not perfect, but it shows direction.

| Company | Year | Estimated Engineers | Investment (R&D or FCF) | Investment per Engineer |
|---------|------|---------------------|--------------------------|--------------------------|
| Meta | 2019 | ~13,483 | ~$10.3B | ~$760k |
| Meta | 2024 | ~22,220 | ~$43.9B | ~$1.98M |
| Google | 2019 | ~35,670 | ~$30.97B | ~$870k |
| Google | 2024 | ~54,997 | ~$72.76B | ~$1.32M |

So companies are spending more money per engineer than before. Not less. That does not sound like replacement. It sounds like deeper investment. Fewer generalists. More specialized people. More infrastructure. More complex systems. More AI operations. More cost per seat. This is not what a company does when it is trying to remove engineers from the equation. This is what a company does when it is trying to level up.

## Why the engineer layoffs feel confusing

The AV industry taught me that hype can inflate teams far beyond what reality can support. When the correction comes, people feel blindsided because they only remember the hiring wave, not the assumptions that created it. The same thing is happening now. Engineers see cuts, but they do not see the earlier hiring spike that caused the imbalance. They see AI headlines, but they do not see the rising investment per engineer. They feel the pain, but they do not see the context.

If you work in tech today, your job is not evaporating. The shape of the work is just shifting. The companies are cutting the soft edges, the duplicated roles, the nice-to-have teams. They are keeping the people who understand systems, scale, and actual engineering. That is not a philosophical trend. It is just how budgets behave when the hype dies down.

And yes, layoffs are rough. I lived through enough of them to know how it feels from the inside. But pointing at AI as the main cause is an easy way to avoid looking at the real picture. The hiring boom was unrealistic from day one, and the correction was coming no matter what models we built. The only surprise is that it took this long.

---

## Sources

1. [Meta employee counts for 2019 and historical values. Macrotrends.](https://www.macrotrends.net/stocks/charts/META/meta-platforms/number-of-employees)

2. [Meta employee count for 2024. Meta Q4 2024 earnings release.](https://investor.atmeta.com)

3. [Google employee counts for 2019 and 2024. Macrotrends.](https://www.macrotrends.net/stocks/charts/GOOGL/alphabet/number-of-employees)

4. [Meta R&D spending for 2019. MarketBeat financial summary.](https://www.marketbeat.com/stocks/NASDAQ/META/financials)

5. [Meta R&D spending for 2024. Macrotrends.](https://www.macrotrends.net/stocks/charts/META/meta-platforms/research-development-expenses)

6. [Alphabet free cash flow for 2019. Macrotrends.](https://www.macrotrends.net/stocks/charts/GOOGL/alphabet/free-cash-flow)

7. [Alphabet free cash flow for 2024. MLQ.ai financial summary.](https://mlq.ai/stocks/GOOG.NE/free-cash-flow)

8. [Engineering headcount ratio assumption. ElectroIQ analysis.](https://electroiq.com/stats/how-many-people-work-at-meta)
