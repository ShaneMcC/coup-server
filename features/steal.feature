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
    When all players pass the Action
    Then the GameEvents contain the following:
      | __type            | player | coins |
      | playerGainedCoins | Alice  | 2     |
      | playerLostCoins   | Bob    | 2     |
    And Alice has 4 coins remaining
    And Bob has 0 coins remaining
    And Bob is the current player

  Scenario: Alice wants to Steal from Bob and is challenged.
    When Alice wants to claim STEAL on Bob
    When Bob challenges the Action
    Then Alice reveals Assassin
    And Alice has 2 coins remaining
    And Bob has 2 coins remaining
    And Bob is the current player

  Scenario: Alice wants to Steal from Bob and gets blocked and bob is unchallenged.
    When Alice wants to claim STEAL on Bob
    When Bob counters with BLOCK_STEAL_WITH_CAPTAIN
    When all players pass the Action
    And all players pass the Counter
    Then Bob is the current player
    And Bob has 2 coins remaining
    And Alice has 2 coins remaining

  Scenario: Alice wants to Steal from Bob and gets blocked and bob is challenged.
    When Alice wants to claim STEAL on Bob
    When Bob counters with BLOCK_STEAL_WITH_CAPTAIN
    When all players pass the Action
    When Alice challenges the Counter
    And Bob reveals Duke
    Then Alice has 4 coins remaining
    And Bob has 0 coins remaining
    And Bob is the current player

  Scenario: Alice wants to Steal from Charlie who has a captain and tries to block it with an Ambassador that is challenged
    When Alice wants to claim STEAL on Charlie
    When Charlie counters with BLOCK_STEAL_WITH_AMBASSADOR
    When all players pass the Action
    When Alice challenges the Counter
    And Charlie reveals Captain
    Then Alice has 4 coins remaining
    And Charlie has 0 coins remaining
    And Bob is the current player

  Scenario: Alice wants to Steal from Charlie who has a captain and tries to block it with an Ambassador unchallenged
    When Alice wants to claim STEAL on Charlie
    When Charlie counters with BLOCK_STEAL_WITH_AMBASSADOR
    And all players pass the Action
    And all players pass the Counter
    Then Alice has 2 coins remaining
    And Charlie has 2 coins remaining
    And Bob is the current player

  Scenario: Alice wants to Steal from Charlie who has a captain and blocks it.
    When Alice wants to claim STEAL on Charlie
    When Charlie counters with BLOCK_STEAL_WITH_CAPTAIN
    When all players pass the Action
    When Alice challenges the Counter
    And Charlie reveals Captain
    And Alice reveals Assassin
    Then Alice has 2 coins remaining
    And Charlie has 2 coins remaining
    And Bob is the current player

  Scenario: Bob can still counter a steal from charlie after alice challenges them and they revealed their captain
    Given it is Charlies turn
    When Charlie wants to claim STEAL on Bob
    And Alice challenges the Action
    And Charlie reveals Captain
    And Alice reveals Assassin
    Then Bob counters with BLOCK_STEAL_WITH_CAPTAIN
    And all players pass the Counter
    Then Alice is the current player
    And Alice has 2 coins remaining
    And Bob has 2 coins remaining
    And Charlie has 2 coins remaining
    And Charlie has 2 influence remaining
    And Alice has 1 influence remaining

  Scenario: Charlie steals from Alice, Alice successfully Challenges and charlie loses their final influence, and can no longer play.
    When Alice wants to claim INCOME
    When Bob wants to claim INCOME
    When Charlie wants to claim INCOME
    When Alice wants to claim ASSASSINATE on Bob
    And all players pass the Action
    And Bob reveals Duke
    Then Bob wants to claim ASSASSINATE on Charlie
    And all players pass the Action
    And Charlie reveals Captain
    Then Charlie wants to claim ASSASSINATE on Alice
    And all players pass the Action
    And Alice reveals Assassin
    Then Alice has 1 influence remaining
    And Bob has 1 influence remaining
    And Charlie has 1 influence remaining
    Given it is Charlies turn
    When Charlie wants to claim STEAL on Alice
     And Bob passes the Action
     And Alice challenges the Action
    When Charlie reveals Contessa
    Then Alice is the current player

  Scenario: Charlie steals from Alice, Alice unsuccessfully Challenges and loses their final influence, and can no longer counter.
    When Alice wants to claim INCOME
    When Bob wants to claim INCOME
    When Charlie wants to claim INCOME
    When Alice wants to claim ASSASSINATE on Bob
    And all players pass the Action
    And Bob reveals Duke
    Then Bob wants to claim ASSASSINATE on Charlie
    And all players pass the Action
    And Charlie reveals Contessa
    Then Charlie wants to claim ASSASSINATE on Alice
    And all players pass the Action
    And Alice reveals Assassin
    Then Alice has 1 influence remaining
    And Bob has 1 influence remaining
    And Charlie has 1 influence remaining
    Given it is Charlies turn
    When Charlie wants to claim STEAL on Alice
     And Bob passes the Action
     And Alice challenges the Action
    When Charlie reveals Captain
     And Alice reveals Ambassador
    Then Bob is the current player

  Scenario: Charlie steals from Alice, Alice unsuccessfully Challenges and loses a single influence, and can also counter.
    When Alice wants to claim INCOME
    When Bob wants to claim INCOME
    When Charlie wants to claim INCOME
    When Alice wants to claim ASSASSINATE on Bob
    And all players pass the Action
    And Bob reveals Duke
    Then Bob wants to claim ASSASSINATE on Charlie
    And all players pass the Action
    And Charlie reveals Contessa
    Then Charlie wants to claim INCOME
    Then Alice has 2 influence remaining
    And Bob has 1 influence remaining
    And Charlie has 1 influence remaining
    Given it is Charlies turn
    When Charlie wants to claim STEAL on Alice
     And Bob passes the Action
     And Alice challenges the Action
    When Charlie reveals Captain
     And Alice reveals Ambassador
    Then Alice counters with BLOCK_STEAL_WITH_CAPTAIN
    And all players pass the Counter
    Then Alice is the current player