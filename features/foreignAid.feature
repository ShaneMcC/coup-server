Feature: Can a player claim Foreign Aid correctly?

  Background:
    Given the following players are in a game:
      | name    | Influence1 | Influence2 |
      | Alice   | Assassin   | Ambassador |
      | Bob     | Duke       | Duke       |
      | Charlie | Captain    | Contessa   |

  Scenario: Alice wants Foreign Aid unchallenged.
    When Alice wants to claim FOREIGN_AID
    Then the GameEvents contain the following:
      | __type                  | player | action      |
      | counterablePlayerAction | Alice  | FOREIGN_AID |
    When all players pass the Action
    Then the GameEvents contain the following:
      | __type            | player | coins |
      | playerGainedCoins | Alice  | 2     |
    And Alice has 4 coins remaining
    And Bob is the current player

  Scenario: Bob counters Alices Foreign Aid uncontested.
    When Alice wants to claim FOREIGN_AID
    When Bob counters with BLOCK_FOREIGN_AID
    When all players pass the Action
    When all players pass the Counter
    Then the GameEvents do not contain the following:
      | __type            | player | coins |
      | playerGainedCoins | Alice  | 2     |
    And Alice has 2 coins remaining
    And Bob is the current player

  Scenario: Charlie gets challenged countering Alices Foreign Aid.
    When Alice wants to claim FOREIGN_AID
    When Charlie counters with BLOCK_FOREIGN_AID
    Then Bob passes the Action
    When Bob challenges the Counter
    Then Charlie reveals CAPTAIN
    Then the GameEvents contain the following:
      | __type                | player  |
      | playerFailedChallenge | Charlie |
    And the GameEvents contain the following:
      | __type            | player | coins |
      | playerGainedCoins | Alice  | 2     |
    And Alice has 4 coins remaining
    And Charlie has 1 influence remaining
    And Alice has 2 influence remaining
    And Bob is the current player

  Scenario: Bob gets challenged countering Alices Foreign Aid.
    When Alice wants to claim FOREIGN_AID
    When Bob counters with BLOCK_FOREIGN_AID
    When all players pass the Action
    When Alice challenges the Counter
    Then Bob reveals DUKE
    Then the GameEvents contain the following:
      | __type                | player |
      | playerPassedChallenge | Bob    |
    And the GameEvents do not contain the following:
      | __type            | player | coins |
      | playerGainedCoins | Alice  | 2     |
    And Alice has 2 coins remaining
    Then Alice reveals Assassin
    And Alice has 1 influence remaining
    And Bob has 2 influence remaining
    And Bob is the current player


  Scenario: When both Bob and Charlie counter Alices Foreign Aid, Bob should be the challenger.
    When Alice wants to claim FOREIGN_AID
    When Bob counters with BLOCK_FOREIGN_AID
    When Charlie counters with BLOCK_FOREIGN_AID
    Then the GameEvents contain the following:
      | __type            | challenger |
      | playerWillCounter | Bob        |
      | playerWillCounter | Charlie    |
      | playerCountered   | Bob        |

  Scenario: Both Bob and Charlie counter Alices Foreign Aid, Bob First, Alice fails to challenge.
    When Alice wants to claim FOREIGN_AID
    When Bob counters with BLOCK_FOREIGN_AID
    When Charlie counters with BLOCK_FOREIGN_AID
    When Alice challenges the Counter
    Then Bob reveals DUKE
    Then Alice reveals Assassin
    Then Bob is the current player

  Scenario: Both Bob and Charlie counter Alices Foreign Aid, Charlie First, Alice passes the first challenge, but fails the second challenge.
    When Alice wants to claim FOREIGN_AID
    When Charlie counters with BLOCK_FOREIGN_AID
    When Bob counters with BLOCK_FOREIGN_AID
    When Alice challenges the Counter
    Then Charlie reveals Captain
    When Alice challenges the Counter
    Then Bob reveals DUKE
    Then Alice reveals Assassin
    Then Bob is the current player