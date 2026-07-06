A: The main thread worth paying attention to today is that AI is moving from a “model capability race” toward a “race in infrastructure and execution reliability.”

B: Right. If you look at today’s stories together, it’s very clear: on one side, the software engineering foundation for AI coding agents and multi-agent workspaces is catching up; on the other, hardware resources like compute, electricity, HBM, and DRAM are continuing to get more expensive and tighter.

A: Let’s start with developer tools. The popular GitHub project `planning-with-files` is a persistent planning system based on Markdown files. The problem it solves is very specific: when an AI coding agent is working on a long task, how does it recover if context is lost? How are completion criteria defined? How do multiple agents share state?

B: This actually shows that AI programming is no longer just about whether code can be written in a single conversation, but whether it can steadily push forward a long-cycle engineering task. Auditable and recoverable state may become a key variable in agent reliability.

A: Similar to that is `gastownhall/gastown`, a multi-agent workspace manager written in Go that has already drawn a lot of attention on GitHub. It targets issues like workspace isolation, state coordination, and result aggregation when multiple AI agents work in parallel.

B: In other words, multi-agent work is not simply opening a few more windows. Once it really enters the engineering workflow, it needs a new project management and collaboration foundation. Otherwise, the efficiency gained from parallelism can easily be canceled out by chaos.

A: Now let’s look at the hardware supply chain. Hon Hai Precision reported quarterly sales up 40% year over year, above market expectations, with one reason being continued growth in AI server demand.

B: The value of this signal is that AI demand is not only reflected in Nvidia chip orders. It also passes through to server assembly and full-system delivery. Supply chain revenue is becoming a window into whether cloud providers’ capital spending is truly being implemented.

A: Storage is also heating up. SK Hynix is reportedly planning a roughly $29 billion listing in the United States, with the core goal of attracting AI storage investors.

B: Behind this is a change in valuation logic. In the past, storage companies were often viewed as cyclical stocks. But after demand for HBM and AI memory picked up, they wanted to enter the pricing system for AI assets in U.S. equities. Where they raise capital has itself become part of the competition for fund flows.

A: But short-term pressure is also very real. Counterpoint data shows that prices for 64GB DIMMs rose 3.5 times from the third quarter of 2025 to the first quarter of 2026, and the cumulative increase is expected to reach 5 times by the third quarter of 2026.

B: So the cost ledger for AI infrastructure is being recalculated. The bottleneck is not only GPUs. After HBM crowds out DRAM wafer capacity, inference, in-memory databases, and cloud service expansion will all be affected by memory prices.

A: Micron is also adding capacity. It has started expanding its wafer fab in Hiroshima, Japan, with an investment of about $9.3 billion, positioning itself for advanced memory chips such as HBM, with shipments expected in the summer of 2028.

B: The key point is the time lag. Japan has subsidies, and manufacturers are expanding capacity, but new capacity will not be released until around 2028. That means the short-term tightness in AI storage will not be solved immediately.

A: The compute race has also extended into electricity. Anthropic plans to secure at least 1.4 million kilowatts of data center resources in Australia, with total investment potentially reaching $15 billion, and aims to bring at least 1 million kilowatts online by the end of next year.

B: This shows that competition among large model companies is no longer just about the pace of model releases. It is about electricity, land, long-term contracts, and data center resources. Whoever can lock in gigawatt-scale resources in advance will find it easier to plan training and inference supply.

A: On the macro market side, emerging market carry traders are reducing dollar-funded positions and shifting toward currencies such as the euro and the Australian dollar as funding sources.

B: This story is not directly related to AI, but it affects global risk appetite. If the dollar is no longer the most suitable funding currency, capital flows into emerging markets will become more dependent on interest rate differentials and exchange rate movements in the euro and Australian dollar.

A: There are also trade-offs at the product level. Doubao announced that its agent feature will be taken offline on July 15. Users can temporarily save related information and historical conversations, but after October 15, they will no longer be recoverable.

B: This is very representative. General-purpose character agents may not be the direction platforms most want to keep investing in. Resources will likely shift more toward higher-frequency and more controllable scenarios such as deep research, programming, e-commerce, and podcasts.

A: Finally, there is discussion around models like MiniMax M3: when model capabilities gradually converge, what else can an AI company rely on to build long-term value?

B: The answer may increasingly lean toward “executability.” It is not just whether the model is smart, but whether it can connect to tasks, complete workflows reliably, and form a closed loop of product and delivery.

A: So today’s main thread can be summed up in one sentence: the AI industry is moving from model performance toward resource control and execution systems.

B: On the software side, companies are adding a state layer. On the hardware side, they are fighting for storage and electricity. On the product side, they are pulling back from uncertain scenarios. What we need to watch next is not only which model is stronger, but who can turn capability into a stable, scalable production system.