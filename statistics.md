# 🏆 ComboKeeper: Statistics & Trophies Reference

This document outlines the logic and flavor text for all dynamic Player and Team statistics generated within ComboKeeper. These trophies gamify the tracking experience and provide critical tactical intel for tournament matches.

---

## 👤 Player Statistics (Personal Accolades)

*Calculated per individual player based on their solo practice (`scores.db`), lobby practice (`LOBBY` MP import), and official match (`MP`) data.*

| Scope | Trophies | Behavior |
|-------|----------|----------|
| **Lifetime** | Night Owl, Employed, Ghost, Purist, FC Machine, Clicker Trained | Sticky once earned (persisted in `PlayerTrophy`) |
| **Per-tournament** | Skill Demon, Ice in the Veins, Tournament Buff/Nerves, Metronome, Support Main, Captain's Anchor, Slave, Scouter | Recalculated per tournament; shown under that tournament on profile |
| **Per-stage (team)** | Hive Mind, Team Slack, etc. | See Team Statistics below |

### 1. The [Skill] Demon (e.g., The Speed Demon, The Aim Demon)

- **Logic:** Awarded based on the specific map skill category where the player has the highest average score.
- **Flavor Text:** "Highest average score in [Skill] (123,456)."

### 2. Ice in the Veins

- **Logic:** Unlocked when the player has logged scores on Tiebreaker (TB) maps during official matches.
- **Flavor Text:** "Averages 123,456 on Tiebreakers during matches."

### 3. Tournament Buff (or Tournament Nerves)

- **Logic:** Unlocked when a player has logged both "PRACTICE" and "MATCH" scores on the exact same maps, allowing the system to compare the two.
- **Flavor Text (Buff):** "Averages +X points higher in official matches than in practice."
- **Flavor Text (Nerves):** "Averages -X points lower in official matches than in practice."

### 4. The Metronome

- **Logic:** Unlocked when a player has played a specific map at least 5 times. Calculates the standard deviation of their scores and awards this for the map where they are the most consistent (lowest variance).
- **Flavor Text:** "Incredibly consistent on NM1 (±1,234)."

### 5. The Purist / The FC Machine

- **Logic:** Unlocked by achieving exactly 100% accuracy on any recorded score. Title swaps based on the tournament game mode (Standard vs. Catch).
- **Flavor Text:** "Has achieved 100% accuracy X time(s)."

### 6. The Slave

- **Logic:** Unlocked by playing absolutely all maps in a single match.
- **Flavor Text:** "This player is a slave to their team."

### 7. The Night Owl

- **Logic:** Triggers if more than 70% of the total scores across all tournaments were set between 12:00 AM and 5:00 AM local time.
- **Flavor Text:** "The moonlight powers their pen. Set 70%+ of their scores past midnight."

### 8. The Employed

- **Logic:** Triggers if more than 70% of the total scores across all tournaments were set between 04:00 PM and 11:00 PM local time.
- **Flavor Text:** "Clocked out and logged in. Set 70%+ of their scores during prime after-work hours."

### 9. The Support Main

- **Logic:** Unlocked when a player consistently ranks #2 or #3 on the team across multiple maps, providing critical backup points without taking the #1 spotlight.
- **Flavor Text:** "The backbone of the lobby. Consistently holding the line with top 3 finishes and providing critical utility to the team, like a true Support main."

### 10. Clicker Trained

- **Logic:** Awarded to the player with an absurdly high retry count or total playcount on a single map in the `scores.db` file.
- **Flavor Text:** "Responds perfectly to positive reinforcement and repetitive behavioral conditioning. Logged 45 attempts on NM3."

### 11. Captain's Anchor

- **Logic:** Unlocked when a player has the highest score on the map with the team's *lowest* overall average. They are carrying the weakest link in the pool.
- **Flavor Text:** "Keeping the pirate ship afloat and saving the crew from sinking. Hard-carrying the team's worst map."

### 12. The Scouter

- **Logic:** Triggers for the player who logs the very first scores in the app within 24 hours of a new stage/mappool dropping.
- **Flavor Text:** "First on the frontline. Scouting the pool before anyone else."

### 13. The Ghost

- **Logic:** Triggers if a player has massive amounts of `scores.db` practice data uploaded, but rarely appears in Multiplayer (`MP`) match links until the official match.
- **Flavor Text:** "Grinds in absolute silence. 90% of scores logged in solo offline practice."

---

## 🛡️ Team Statistics (Captain's Dashboard & Intel)

*Calculated using the aggregated data of the entire active roster to identify overarching behavioral trends and tactical advantages.*

### 1. The Hive Mind

- **Logic:** Triggers when the top 3 players on a specific map have an incredibly tight score spread (a maximum difference of ±15,000 to 20,000 points between the #1 and #3 player).
- **Flavor Text:** "Terrifyingly synchronized. Top 3 players are within 15k points of each other on DT2."

### 2. Consistent Performers

- **Logic:** Triggers if the team's overall playstyle is extremely stable. Requires the average standard deviation across all maps to be less than 40,000 points.
- **Flavor Text:** "Statistically unshakable. Team-wide score variance is minimal."

### 3. High Risk, High Reward

- **Logic:** Triggers if the team's overall playstyle is highly erratic, requiring an average standard deviation across all maps of over 75,000 points.
- **Flavor Text:** "Pure chaos. Either FCing the map or failing out entirely."

### 4. The Veto Target 

- **Logic:** Highlights the specific map where the team’s combined average score is the lowest, and the standard deviation is high.
- **Flavor Text:** "Statistically the worst map. Average score: 412,000. Ban immediately."

### 5. The Comfort Pick 

- **Logic:** The map with the highest minimum score across the entire active roster.
- **Flavor Text:** "A guaranteed point. The lowest team score on this map is still 890,000."

### 6. The Mutiny

- **Logic:** Triggers if the combined average scores of the roster surpass the Team Captain’s average scores across a specific stage.
- **Flavor Text:** "The crew is outperforming the captain this week. A full-scale mutiny is brewing on the leaderboard."

### 7. Team Slack

- **Logic:** Calls out every accepted roster player who has logged fewer than 2 runs on any map in the current stage mappool (tiebreaker maps excluded). Shows per-map gaps (e.g. NM3: 0/2) in the Practice Coverage panel.
- **Flavor Text:** "These players haven't completed 2 runs on every map yet. Step it up!"

### 8. Pat on the Back

- **Logic:** Awarded when every accepted roster player has logged at least 2 runs on every non-tiebreaker map in the current stage mappool. Mutually exclusive with Team Slack for the same stage — you get one or the other.
- **Flavor Text:** "Everyone on the roster logged at least 2 runs on all maps in the pool. The crew is locked in."

### 9. Maps to Practice

- **Logic:** Ranks up to 3 non-tiebreaker maps (excluding comfort pick, ban target, safe pick, and coinflip pick) where the team needs the most work. Uses practice/lobby scores only for averages. Unplayed pool maps rank highest. Maps with roster coverage gaps (fewer than 2 runs per player) are boosted in priority.
- **Flavor Text:** "Priority #1: NM3 — Team is struggling here. Practice avg 412,000 across 8 solo/lobby plays."

---

## Mod Support

*Currently we only have support for Mix Mod and FreeMod, imported officially from the osu!wiki*

### MM (MixedMod)

The Mixed Mod bracket will be played with FreeMod activated. Each player will be forced to choose one mod each, from a selection of NoMod, Hidden, and Hard Rock. Each mod must be played by exactly one player (i.e. one player MUST pick NoMod, another player MUST pick Hidden, and the remaining player MUST pick Hard Rock).

- The player using Hard Rock may choose to use Hidden and Hard Rock or just Hard Rock.

### FM (ForcedMod)

- Forced Mod

### FM (FreeMod)

The FreeMod bracket will have "Free Mods" enabled, that is, players will be able to select what mods they use.

- Possible mod choices are Hidden, Hard Rock, and Hidden + Hard Rock.
- When playing a FreeMod beatmap, there must be one player with Hidden and one player with Hard Rock or Hidden + Hard Rock. For the remaining players, enabling mods is optional.

## TB (Tiebreaker)

The tiebreaker will be played under Free Mod conditions, but players are exempt from the mod requirement.