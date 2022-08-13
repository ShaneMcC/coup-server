import IncomeAction from './Actions/Income.js';
import CoupAction from './Actions/Coup.js';
import ForeignAidAction from './Actions/ForeignAid.js';
import StealAction from './Actions/Steal.js';
import TaxAction from './Actions/Tax.js';
import ExchangeAction from './Actions/Exchange.js';
import AssassinateAction from './Actions/Assassinate.js';

export const DefaultActions = {
    INCOME: IncomeAction,
    COUP: CoupAction,
    FOREIGN_AID: ForeignAidAction,
    STEAL: StealAction,
    TAX: TaxAction,
    EXCHANGE: ExchangeAction,
    ASSASSINATE: AssassinateAction,
}

export const DefaultCounterActions = {
    BLOCK_FOREIGN_AID: {
        'name': 'Block Foreign Aid',
        'validCards': ['DUKE'],
    },

    BLOCK_STEAL_WITH_CAPTAIN: {
        'name': 'Block Steal using Captain',
        'validCards': ['CAPTAIN'],
    },

    BLOCK_STEAL_WITH_AMBASSADOR: {
        'name': 'Block Steal using Ambassador',
        'validCards': ['AMBASSADOR'],
    },

    BLOCK_ASSASSINATE: {
        'name': 'Block Assassination',
        'validCards': ['CONTESSA'],
    }
}