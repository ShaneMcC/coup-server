Feature: Can a player claim Steal correctly?

  Background:
    Given the following players are in a game:
      | name    | Influence1 | Influence2 |
      | Alice   | Assassin   | Ambassador |
      | Bob     | Duke       | Duke       |
      | Charlie | Captain    | Contessa   |

  Scenario: Alice wants to Steal from Bob unchallenged.
    When Alice wants to claim STEAL on Bob
    Then the GameEvents contain the following:
      | __type                  | player | action |
      | counterablePlayerAction | Alice  | STEAL  |
    When all players pass
    Then the GameEvents contain the following:
      | __type            | player | coins |
      | playerGainedCoins | Alice  | 2     |
      | playerLostCoins   | Bob    | 2     |
    And Alice has 4 coins remaining
    And Bob has 0 coins remaining
    And Bob is the current player

  Scenario: Alice wants to Steal from Bob and is challenged.
    When Alice wants to claim STEAL on Bob
    When Bob challenges
    Then Alice reveals Assassin
    And Alice has 2 coins remaining
    And Bob has 2 coins remaining
    And Bob is the current player

  Scenario: Alice wants to Steal from Bob and gets blocked and bob is unchallenged.
    When Alice wants to claim STEAL on Bob
    When Bob counters with BLOCK_STEAL_WITH_CAPTAIN
    When all players pass
    Then it is Bobs turn
    And Bob has 2 coins remaining
    And Alice has 2 coins remaining
    And Bob is the current player

  Scenario: Alice wants to Steal from Bob and gets blocked and bob is challenged.
    When Alice wants to claim STEAL on Bob
    When Bob counters with BLOCK_STEAL_WITH_CAPTAIN
    When Alice challenges
    And Bob reveals Duke
    Then Alice has 4 coins remaining
    And Bob has 0 coins remaining
    And Bob is the current player

  Scenario: Alice wants to Steal from Charlie who has a captain and tries to block it with an Ambassador that is challenged
    When Alice wants to claim STEAL on Charlie
    When Charlie counters with BLOCK_STEAL_WITH_AMBASSADOR
    When Alice challenges
    And Charlie reveals Captain
    Then Alice has 4 coins remaining
    And Charlie has 0 coins remaining
    And Bob is the current player

  Scenario: Alice wants to Steal from Charlie who has a captain and tries to block it with an Ambassador unchallenged
    When Alice wants to claim STEAL on Charlie
    When Charlie counters with BLOCK_STEAL_WITH_AMBASSADOR
    And all players pass
    Then Alice has 2 coins remaining
    And Charlie has 2 coins remaining
    And Bob is the current player

  Scenario: Alice wants to Steal from Charlie who has a captain and blocks it.
    When Alice wants to claim STEAL on Charlie
    When Charlie counters with BLOCK_STEAL_WITH_CAPTAIN
    When Alice challenges
    And Charlie reveals Captain
    And Alice reveals Assassin
    Then Alice has 2 coins remaining
    And Charlie has 2 coins remaining
    And Bob is the current player