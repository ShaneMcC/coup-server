Feature: Can a player assassinate correctly?

  Background:
    Given the following players are in a game:
      | name    | Influence1 | Influence2 | coins |
      | Alice   | Assassin   | Ambassador | 5     |
      | Bob     | Duke       | Duke       | 5     |
      | Charlie | Captain    | Contessa   | 5     |

  Scenario: Alice wants to Assassinate Bob unchallenged.
    When Alice wants to claim ASSASSINATE on Bob
    And all players pass the Action
    Then Bob reveals Duke
    And Bob has 1 influence remaining
    And Alice has 2 influence remaining
    Then Bob is the current player

  Scenario: Alice wants to Assassinate Charlie and gets countered.
    When Alice wants to claim ASSASSINATE on Charlie
    And Charlie counters with BLOCK_ASSASSINATE
    And all players pass the Action
    And all players pass the Counter
    Then Bob is the current player
    And Charlie has 2 influence remaining
    And Alice has 2 influence remaining
    And Alice has 2 coins remaining

  Scenario: Bob wants to Assassinate Charlie and gets challenged.
    When it is Bobs turn
    And Bob wants to claim ASSASSINATE on Charlie
    And Charlie challenges the Action
    Then Bob reveals DUKE
    And Charlie has 2 influence remaining
    And Bob has 1 influence remaining
    And Charlie is the current player
    And Bob has 2 coins remaining

  Scenario: Alice wants to Assassinate Charlie and gets challenged by Charlie.
    When Alice wants to claim ASSASSINATE on Charlie
    And Charlie challenges the Action
    Then Alice reveals Assassin
    Then Charlie reveals Contessa
    Then Charlie passes the Action
    Then Charlie reveals Captain
    Then Bob is the current player
    And Charlie has 0 influence remaining
    And Bob has 2 influence remaining
    And Alice has 2 influence remaining
    And Alice has 2 coins remaining

  Scenario: Alice wants to Assassinate Charlie and gets challenged by Bob.
    When Alice wants to claim ASSASSINATE on Charlie
    And Bob challenges the Action
    Then Alice reveals Assassin
    Then Bob reveals Duke
    And Charlie passes the Action
    Then Charlie reveals Contessa
    Then Bob is the current player
    And Charlie has 1 influence remaining
    And Bob has 1 influence remaining
    And Alice has 2 influence remaining
    And Alice has 2 coins remaining

  Scenario: Alice wants to Assassinate Charlie and gets challenged by Bob and then Charlie Counters.
    When Alice wants to claim ASSASSINATE on Charlie
    And Bob challenges the Action
    Then Alice reveals Assassin
    Then Bob reveals Duke
    And Charlie counters with BLOCK_ASSASSINATE
    And all players pass the Counter
    Then Bob is the current player
    And Charlie has 2 influence remaining
    And Bob has 1 influence remaining
    And Alice has 2 influence remaining
    And Alice has 2 coins remaining

  Scenario: Alice wants to Assassinate Charlie and gets challenged by Bob and then Charlie Counters and is challenged successfully.
    When Alice wants to claim ASSASSINATE on Charlie
    And Bob challenges the Action
    Then Alice reveals Assassin
    Then Bob reveals Duke
    And Charlie counters with BLOCK_ASSASSINATE
    And Alice challenges the Counter
    And Charlie reveals Contessa
    And Alice reveals Ambassador
    Then Bob is the current player
    And Charlie has 2 influence remaining
    And Bob has 1 influence remaining
    And Alice has 1 influence remaining
    And Alice has 2 coins remaining

  Scenario: Alice wants to Assassinate Charlie and gets challenged by Bob and then Charlie Counters and is challenged unsuccessfully.
    When Alice wants to claim ASSASSINATE on Charlie
    And Bob challenges the Action
    Then Alice reveals Assassin
    Then Bob reveals Duke
    And Charlie counters with BLOCK_ASSASSINATE
    And Alice challenges the Counter
    And Charlie reveals Captain
    And Charlie reveals Contessa
    Then Bob is the current player
    And Charlie has 0 influence remaining
    And Bob has 1 influence remaining
    And Alice has 2 influence remaining
    And Alice has 2 coins remaining

  Scenario: Alice wants to Assassinate Charlie without her contessa and gets challenged by Bob.
    When Alice wants to claim ASSASSINATE on Charlie
    And Bob challenges the Action
    Then Alice reveals Ambassador
    Then Bob is the current player
    And Charlie has 2 influence remaining
    And Bob has 2 influence remaining
    And Alice has 1 influence remaining
    And Alice has 2 coins remaining

  Scenario: Alice wants to Assassinate Charlie and gets countered but and the counter is challenged successfully
    When Alice wants to claim ASSASSINATE on Charlie
    And Charlie counters with BLOCK_ASSASSINATE
    And Bob passes the Action
    And Bob passes the Counter
    And Alice challenges the Counter
    And Charlie reveals Contessa
    And Alice reveals Assassin
    Then Bob is the current player
    And Charlie has 2 influence remaining
    And Bob has 2 influence remaining
    And Alice has 1 influence remaining
    And Alice has 2 coins remaining

  Scenario: Alice wants to Assassinate Charlie and gets countered and the counter is challenged unsuccessfully
    When Alice wants to claim ASSASSINATE on Charlie
    And Charlie counters with BLOCK_ASSASSINATE
    And Bob passes the Action
    And Bob passes the Counter
    And Alice challenges the Counter
    And Charlie reveals Captain
    And Charlie reveals Contessa
    Then Bob is the current player
    And Charlie has 0 influence remaining
    And Bob has 2 influence remaining
    And Alice has 2 influence remaining
    And Alice has 2 coins remaining

  Scenario: After Alice has assasinated Charlie, Bob also wants to Assassinate Charlie and gets countered and the counter is challenged unsuccessfully and Charlie only has 1 influence to discard
    When Alice wants to claim INCOME
    When Bob wants to claim ASSASSINATE on Charlie
    And Alice passes the Action
    And Charlie passes the Action
    And Charlie reveals Contessa
    Then Charlie is the current player
    And Charlie has 1 influence remaining
    Then Charlie wants to claim INCOME
    When Alice wants to claim ASSASSINATE on Charlie
    And Charlie counters with BLOCK_ASSASSINATE
    And Bob passes the Action
    And Bob passes the Counter
    And Alice challenges the Counter
    And Charlie reveals Captain
    Then Bob is the current player
    And Charlie has 0 influence remaining
    And Bob has 2 influence remaining
    And Alice has 2 influence remaining
    And Alice has 3 coins remaining

  Scenario: Alice wants to Assassinate Charlie and gets challenged by Charlie and then Charlie also Counters.
    When Alice wants to claim ASSASSINATE on Charlie
    Then Bob passes the Action
    And Charlie challenges the Action
    Then Alice reveals Assassin
    Then Charlie reveals Captain
    And Charlie counters with BLOCK_ASSASSINATE
    And Alice passes the Counter
    And Bob passes the Counter
    Then Bob is the current player
    And Charlie has 1 influence remaining
    And Bob has 2 influence remaining
    And Alice has 2 influence remaining
    And Alice has 2 coins remaining

  Scenario: Alice wants to Assassinate Charlie and gets challenged by Charlie and then Charlie also Counters and gets challenged by Bob unsuccessfully
    When Alice wants to claim ASSASSINATE on Charlie
    Then Bob passes the Action
    And Charlie challenges the Action
    Then Alice reveals Assassin
    Then Charlie reveals Captain
    And Charlie counters with BLOCK_ASSASSINATE
    And Alice passes the Counter
    And Bob challenges the Counter
    And Charlie reveals Contessa
    And Bob reveals Duke
    Then Bob is the current player
    And Charlie has 1 influence remaining
    And Bob has 1 influence remaining
    And Alice has 2 influence remaining
    And Alice has 2 coins remaining

  Scenario: Alice wants to Assassinate Charlie and gets challenged by Charlie and then Charlie also Counters and gets challenged by Bob successfully
    When Alice wants to claim ASSASSINATE on Charlie
    Then Bob passes the Action
    And Charlie challenges the Action
    Then Alice reveals Assassin
    Then Charlie reveals Contessa
    And Charlie counters with BLOCK_ASSASSINATE
    And Alice passes the Counter
    And Bob challenges the Counter
    And Charlie reveals Captain
    Then Bob is the current player
    And Charlie has 0 influence remaining
    And Bob has 2 influence remaining
    And Alice has 2 influence remaining
    And Alice has 2 coins remaining
