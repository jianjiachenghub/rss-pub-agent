**Personal Daily | Today's Picks**

**(Opening)**

**A:** Hey, have you noticed a really obvious trend in the AI space lately? Everyone's grinding away at one thing—how to make large language models cheaper and more efficient.

**B:** Yeah, both training and inference costs are being squeezed like crazy. Several news items today point in this direction, so let's go through them one by one.

**(Main Thread One: Architecture Innovation)**

**A:** First, let's talk about the EMO model Ai2 just released. It's an end-to-end pre-trained MoE architecture, but with a really clever design—it forces all tokens from the same document to be routed to a shared subset of experts.

**B:** Oh, so the router learns to form domain-specific groupings automatically during training? Like medical experts, coding experts, that sort of thing?

**A:** Exactly! The most practical part is, for specific tasks you only need to invoke 12.5% of the expert subset, yet get performance close to the full model. That means the hardware barrier for deploying large models could drop by an order of magnitude.

**(Main Thread Two: Cost Optimization)**

**B:** Speaking of cost reduction, Baidu's Wenxin 5.1 released today is pretty aggressive too. Pre-training costs are only 6% of industry peers at the same scale, yet its search capabilities topped the domestic charts.

**A:** That 6% figure is pretty extreme. They're using "multi-dimensional elastic pre-training," which basically means teaching the model to "go hard where it matters and slack off where it doesn't"—not just brute forcing everything.

**B:** That's the key to commercial deployment. After all, cost determines who can actually put large models into production, rather than just keeping them at the demo stage.

**(Main Thread Three: Terminal Efficiency)**

**A:** There's also a more extreme open-source project called Reasonix. The developers pushed DeepSeek's caching mechanism to the limit, dropping long-conversation costs by 80%.

**B:** This is an AI coding assistant for terminal environments, right?

**A:** Right, runs specifically on local terminals. The consensus in the industry now is that simply making models bigger isn't enough—they need to run efficiently on edge devices too for the cost structure to really change.

**(Main Thread Four: Industry Pace)**

**B:** DeepSeek also has new moves on their end. They're planning to release V4.1 in June and accelerate their release cadence to match industry mainstream levels.

**A:** Plus Ant Group's Bailian released the trillion-parameter reasoning model Ring-2.6-1T today. You can see that domestic large models have entered a white-hot competition phase where they need "big parameters, fast iteration, and low cost" all at the same time.

**(Ethics and Security Perspective)**

**B:** But as technology races ahead, the side effects are becoming more exposed too. Two things today are worth noting: first, US borders are starting to deploy real-time AI surveillance systems that assess risk profiles through behavioral data.

**A:** The privacy boundaries and judgment accuracy in these scenarios definitely need more discussion. Then there's the case of the lawyer in China who was wrongly told by Baidu's AI he had been "sentenced to three years"—a textbook case of hallucination leading to infringement.

**B:** Right, when technology costs drop and applications become widespread, content accuracy becomes an even bigger shortcoming. Being cheap can't be an excuse for making mistakes.

**(Macro Context)**

**A:** Finally, let's quickly touch on the macro picture. China's export data is rebounding, showing that current geopolitics is actually disrupting global trade links less than expected. Also, from the Fed side, Waller proposed consolidating some functions of the regional Feds to reduce redundant operations.

**B:** So from the financial system to the AI industry, everyone's operating under this "cost-cutting and efficiency improvement" backdrop.

**(Closing)**

**A:** So you see, today's through-line is pretty clear—from technical architecture to commercial deployment, everyone's looking for more efficient and sustainable ways forward.

**B:** But don't forget, beyond efficiency, reliability and ethical boundaries matter just as much. After all, even if models are cheap, the cost of getting things wrong can be pretty steep.