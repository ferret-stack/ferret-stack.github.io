---
layout: post
title: "Beyond the Cards - How One Simple Game Reveals Poker's Complex Strategies"
date: 2024-02-25
mathjax: true
categories: poker strategy
author: Ferret Stack
---
<b>Note:</b> GTO is <em>one</em> aspect of being a good player. It's not a matter of "do this and you'll print money"; you must honestly understand this and why it works. 

As Napoleon said:

<blockquote>Laws that prove consistent in theory often prove chaotic in practice.</blockquote>

Cheers.

<hr>

Picture this: You arrive on the river and the dealer lays down the **4d**. An initially innocuous card, but then to your horror you notice that it completes the flush. Your opponent, having called your bets on every street, checks to you. What do you do? Value bet with your top pair? Fire a bluff with your busted straight draw? Check and hope your second pair is good? 

For players looking to master game theory optimal (GTO) poker strategy, understanding complex mathematical concepts and solver output can be overwhelming and misunderstanding it could be detrimental to your winrate. Whether you're playing at the microstakes or highstakes, understanding GTO is important.

Enter the Clairvoyance Game, a fundamental poker theory model that breaks advanced poker concepts into digestible concepts. Don't let its simplicity fool you - buried within this minimal framework are the seeds of optimal poker strategy at its highest level. Nash equilibrium, game theory optimal play, balanced strategies, exploitation, betting for value, bluffing for protection - it's all here. 

In this article, we'll first dive deep into the Clairvoyance Game to understand these key concepts on a fundamental level. Then, armed with our new knowledge, we'll zoom out to real-world poker situations to see these principles in action. By the end, you'll have a powerful framework for thinking about the game that will help you make better decisions and win more money at the tables.
## The Clairvoyance Game: Poker's Magic Crystal Ball
The Clairvoyance Game theory model, also called The AKQ Game, is a theoretical game devised by Bill Chen and Jarred Ankenman in their book *The Mathematics of Poker*, which strips poker down to its absolute essence using just three cards and two players, creating a laboratory for understanding fundamental concepts and game theory optimal (GTO) poker.

Each player antes £1 and receives a card from a deck containing only an Ace (highest), King, and Queen (lowest). Player 1, who is first to act, always gets dealt a King, while Player 2, who is last to act, is dealt either an Ace or a Queen. The game features a single betting round where Player 1 can either check or bet £1; after a check, Player 2 can likewise check or bet £1; after any bet (by either player) their opponent must either call £1 or fold. At showdown, the highest card wins the pot.

While the rules may seem similar to Texas hold 'em, it's not nearly as exciting to play as the full game. The beauty of the Clairvoyance Game reveals itself in the constant dance between exploiting opponents and protecting ourselves from exploitation. 

Put yourself in the shoes of Player 2: If you never bluff your Queen, then savvy opponents will ruthlessly fold their King to your bets, thus denying crucial value to your Aces. However, if you bluff too frequently, they'll snap-call with their Kings, and punish your aggression.

What is interesting about this is that it highlights you shouldn't only bet with your value hands. This conclusion isn't just theoretical - the maths shows we should bluff exactly $\frac{1}{3}$ of the time with our Queens and bet all of our Aces for value. The aim of this is to make our opponent *indifferent* to calling or folding: creating a situation where the [expected value](https://coinpoker.com/expected-value-in-poker/) of calling for Player 1 is £0. 

When Player 1 calls and Player 2 has a Queen (a bluff), they win $\text{$}$3 (the £2 already in the pot, plus Player 2's £1 bet). When Player 1 has an Ace, then Player 2 loses £1 (though they ante £1, this is already in the pot and **is no longer theirs**).

### The Mathematics Behind Game Theory Optimal Poker Strategy
Let's prove this together (don't worry - you don't need to do algebra at the poker table, but it's important to understand the concept!)

$$
\text{EV} = \text{(\% Bluff} \cdot \text{£};3) - ((1 - \text{\% Bluff)} \cdot \text{£}1)
$$
As described above, Player 2 wants to make Player 1 *indifferent* and so we set EV to £0. If we solve for `% Bluff`, we get a value of $\frac{1}{4}$: for every four bets that Player 2 makes, three of them should be value (Aces) and one should be a bluff (Queens). 

We can also solve for the optimal calling strategy for Player 1. For this, we need to consider the game from the perspective of Player 2, in which case when Player 1 folds, they win £2, and when they're called while bluffing they lose £1:

$$
\text{EV} = ((1-\text{\% Call)} \cdot \text{$}2) - (\text{\% Call} \cdot \text{$}1)
$$
Once again, by setting EV to £0 and solving for `% Call` then we get $\frac{2}{3}$ and this is the frequency that Player 1 has to call to make Player 2 indifferent between bluffing and checking with a Queen.

The Clairvoyance Game thus shows Player 2 should bluff with Queens, in order to get value from their Aces, while Player 1 needs to call so Player 2 doesn't get away with profitably bluffing every time. However, it also demonstrates the importance of position.

### How Position Influences Optimal Poker Decisions
Player 2 has a 50% chance of being dealt either an Ace, which we know they'll always bet, or a Queen, which we know they'll bet $\frac{1}{3}$ of the time. We can calculate their overall betting frequency as:

$$
\left[\frac{1}{2} + \left(\frac{1}{2} \cdot \frac{1}{3}\right) = \frac{4}{6}\right] = \frac{2}{3}
$$

In other words, two-thirds of the time, Player 2 will bet and will win $\text{$}$2 and thus gives an expected value of $\frac{2}{3} \cdot \text{$}2 = £1.33$, though as they had to ante £1, this gives an overall winrate of £0.33. As this is a zero sum game (what is won by the winner must be equal to what is lost by the loser), Player 1 therefore has a winrate of -£0.33 *even when they play optimally!*

Related: [A Complete Guide to Poker Positions](https://coinpoker.com/poker-position/)
## Applying Clairvoyance Game Theory to Real Poker Strategy: Understanding Range Polarisation

The lessons of the Clairvoyance Game may seem abstract, but they have direct applications to real-world poker scenarios, especially when it comes to polarised ranges and balanced strategies.

A *polarised* range is a range construction of hands that are either strong or weak: value bets or bluffs. Meanwhile, a condensed range is made up of medium strength hands that will lose to the value region of a polarised range, but are able to beat the bluffing portion of a polarised range; for this reason, a condensed range may also be described as a *bluff catching* range. Generally, betting and raising ranges are polarised, while checking and calling ranges are condensed.

Suppose we hold **Ah9h** and we get to the river of **Kh 7d 3h 9d 4d**, giving us second pair, but there is now a flush on the board. 

We're in-position (IP) and the out-of-position (OOP) player, having check-called our flop and turn bets, checks to us once again. In this scenario, we have the polarised range and we'd bet big for value with our sets, straights, and flushes. Our current hand, one pair, may only be good for thin value. However, in poker, we should be focused on what the *range* of our hands wants to do. 

As the IP player, with a polarised range, we have a decision to make: do we bet for value or as a bluff? What's our optimal bet size? If we have a flush or better, the decision is easy - we bet for value, trying to extract as much as possible from worse hands (just like how we always bet our Aces in the Clairvoyance Game). But with one pair, it's a little trickier. We need to consider what worse hands will call us and, more importantly, how often we need to be bluffing to remain balanced.

This is where the lessons from the Clairvoyance Game really shine and can help in selecting optimal bet sizes when value betting and bluffing. 

Remember, if IP bets their Ace all the time and also bluffs with their Queen a third of the time, OOP's King becomes indifferent between calling and folding. The same principle applies here. If we only ever bet our flushes and better for value, OOP can easily fold their bluff catchers and beat us, but if we bluff too aggressively then OOP's decision to call with their bluff catchers becomes more trivial; we need to balance our value bets with appropriate bluffs.
### Calculating Optimal Bet Sizes and Bluffing Frequencies
Instead of **Ah9h**, let's now assume we hold **AdQh** - a fantastic bluff candidate. Why? Well, consider this: If we hold the Ace of diamonds, it means our opponent cannot have the nut flush. They might still hold a flush, like **Qd9d**, but it isn't the *best* possible flush. Another bluff candidate could be **T8** for the busted straight draw.

The size of our bet also matters. If we bet smaller, say $	ext{$}$50 into the £200 pot, we can bet a more condensed range for value, like our **Ad9h** discussed above. But this also means we need to bluff less often to remain balanced, since OOP will be getting better odds to call with their bluff catchers. We can simplify the poker mathematics from the Clairvoyance Game above to:

$$
\text{Bluffing Frequency} = \frac{\text{Bet}}{(\text{Bet} + \text{Pot})}
$$

Giving us a bluffing frequency of $\frac{50}{(50 + 250)} = \frac{1}{6} \approx 16\%$

**IMPORTANT:** A common mistake when analysing these scenarios is to forget that, by betting, we grow the pot. This is why `250` is in the denominator, not `200`. 

On the other hand, if we overbet, perhaps £300 into the £200 pot, our range becomes extremely polarised. We can only really bet flushes, straights, and sets for value now. As such, we need to be bluffing a higher percentage of the time to compensate, perhaps with our aforementioned busted draws like **T8**, or **AdQh** with the nut-flush blocker (that may get even **Qd9d** to fold if our opponent is especially tight). 

This gives us a bluffing frequency of $\frac{300}{(300 + 500)} = \frac{3}{8} \approx 38\%$ 

## Exploitative Poker Strategy: Moving Beyond GTO
In recent years, game theory optimal (GTO) poker, similar to what we've just discussed in this article, has become biblical for studied poker players. However, while it's important to understand the theory and certain betting frequencies, replicating solver output is not a guidebook. Humans aren't rational, and we're not capable of playing an accurate and balanced strategy. Tight players might fold their weaker Q high flush, while looser players may call with any flush and bluffing would be a very bad decision!

Related: [The Types of Cognitive Bias That Are Affecting Your Game](https://coinpoker.com/the-types-of-cognitive-bias-that-are-affecting-your-game/)

By taking the concepts of the Clairvoyance Game, and understanding solver output to the wider array of ranges and infinite number of spots that occur in real life poker, we can use this as a baseline to exploit our opposition through hand reading and player-type tendencies. At the core, if our opponents are folding too much: Bluff more often. If opponents are calling too much: Bluff less often and value bet relentlessly. By appreciating these nuances, you can improve your winrate and become a winning poker player.

## Conclusion: From Simplicity to Mastery
The Clairvoyance Game may be simple, but it effectively illustrates the complex concepts of game theory, balanced ranfes, and exploitative play in poker. By understanding how to balance our value bets with appropriate bluffs and adapting to our opponents' tendencies, we can protect our strategy from exploitation while maximizing our profits.

As you continue your poker journey, think about the game in terms of ranges and frequencies, and apply the lessons of the Clairvoyance Game to your own play. By combining a solid theoretical foundation with a keen eye for exploitation, you'll be well-equipped to navigate even the most complex poker situations with confidence and success. Remember, the true art of poker lies in adapting to specific opponents and game dynamics, and by channelling the simplicity of this toy game, you'll be one step closer to mastering the beautiful and endlessly fascinating game of poker.
