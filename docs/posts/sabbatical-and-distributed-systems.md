---
title: "Sabbatical and Distributed Systems"
date: 2024-09-30
categories:
  - Software Engineering
  - Books and Articles
  - Architecture
tags:
  - Distributed Systems
---
<figure style="float: left; width: 300px; margin: 0 1em 1em 0;" markdown>
  <a href="https://sysdev.me/wp-content/uploads/2024/09/1-scaled.jpeg" target="_blank">
    <img src="https://sysdev.me/wp-content/uploads/2024/09/1-scaled.jpeg" alt="caption" width="250">
  </a>
  <figcaption>
    View from the rooftop of the apartment, where we settled down. I love running up on the left side of the river—quite a nice trail run.
  </figcaption>
</figure>

Working at a unicorn company for four years was an exhilarating experience, though incredibly exhausting. Tackling significant projects that few have ever attempted means Google can’t offer much help. Surrounded by highly talented colleagues, many of whom you may never encounter again in one place, all while facing a relentless pace and high expectations from leadership, it eventually takes a toll. After a while, you just need to pause, rest, and reflect. That’s why I left Motional—to take several months to recharge, spend time with family, and reconnect with my hobbies.

The irony is, after more than 20 years in IT, I’ve become somewhat of a workaholic, so proper rest eludes me. Just last weekend, I found myself speaking at the [DevFest ’24](https://www.linkedin.com/posts/gdg-bishkek_объявляем-спикеров-devfest-2024-с-радостью-activity-7237857767137435651-DpTq/) conference, [sharing insights on best practices in project development](https://docs.google.com/presentation/d/1eusLUNpu1eOugbAPnrL0eoVA1P-U6U0SINnCTSBOkQg/edit) with the local IT community. The event exceeded all my expectations. It’s been incredibly gratifying to see how much Kyrgyzstan’s IT sector has grown since I left in 2003. I sincerely hope this growth continues and that, eventually, talented engineers will want to stay here or return to the country instead of trying themselves outside, as I did. However, I’m also acutely aware that I’m now overqualified for most roles in the Kyrgyz job market, which is a bit bittersweet. So, my journey will likely inevitably take me elsewhere after my sabbatical.

It’s funny (or maybe a bit sad, depending on how you look at it), but my workaholic side insists that taking it easy isn’t enough. Now, with plenty of free time, I’ve decided to tackle something I’ve always wanted to dive deeper into: Distributed Systems theory. Yes, the theory itself—not just the practical implementation that most developers focus on. So, I have a Plan.
<!-- more -->
I had previously watched Martin Kleppmann’s [Distributed Systems lecture series](https://www.youtube.com/playlist?list=PLeKd45zvjcDFUEv_ohr_HdUFe97RItdiB), but this time, I’m approaching it with more focus, adding the course’s accompanying textbook into the mix. A quick review shows that it covers what I’m looking for, though it doesn’t dive quite deep enough into the theoretical aspects.

At the same time, I’ve had [Introduction to Reliable and Secure Distributed Programming](https://www.goodreads.com/book/show/10064443-introduction-to-reliable-and-secure-distributed-programming) by Christian Cachin and co-authors sitting on my bookshelf for a while, and that’s where I’ll be focusing my efforts. I suspect the Distributed Systems lecture series is grounded in much of this book’s theory. It may not be the most leisurely read on the art of distributed systems, but who ever said learning something worthwhile should be easy?

However, even theoretical study requires some hands-on practice. That’s where the fantastic [Maelstrom](https://github.com/jepsen-io/maelstrom) tool from [jepsen.io](https://jepsen.io) comes in. Maelstrom offers a series of challenges, starting with something simple like an Echo and progressing to more complex tasks like Raft. Since Maelstrom is a beautifully designed Clojure-based app with well-defined protocols for each challenge, adding more challenges should be both easy and fun.


<figure style="float: left; width: 300px; margin: 0 1em 1em 0;" markdown>
  <a href="https://sysdev.me/wp-content/uploads/2024/09/1-1.jpeg" target="_blank">
    <img src="https://sysdev.me/wp-content/uploads/2024/09/1-1.jpeg" alt="caption" width="250">
  </a>
  <figcaption>
    Bishkek - Osh road. Kyrgyz mountains are magnificent at any time.
  </figcaption>
</figure>

That said, most of this work revolves around Centralized Distributed Systems, which makes sense given their dominance. Naturally, I’m also curious about a solid theoretical resource on **De**centralized Distributed Systems. The best I’ve found so far is the [Decentralized Thoughts](https://decentralizedthoughts.github.io) post series. It’s relatively easy to follow and seems to cover many important aspects of decentralized distributed systems theory. I’m unsure if a better resource exists, but it looks like a great starting point.

Ultimately, this sabbatical has given me the time to reconnect with my passion for learning and exploring the theoretical depths of distributed systems. Whether centralized or decentralized, each layer of complexity opens up new ways to think about how we build and maintain reliable systems. As I continue down this path, I’m excited to see where these studies will lead, and I hope that by sharing my journey, I can inspire others to dive deeper into the technical topics they’ve always wanted to explore.