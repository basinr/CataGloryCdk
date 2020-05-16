import * as dynamoDao from '../dao/dynamoDao';
import * as scoreCalculator from './scoreCalculator';
import * as gameManager from '../manager/gameManager';
import { DynamoItem } from '../dao/dynamoDao';
import { AnswerPrefix, AnswerDynamoItem } from '../manager/answerManager';

export const handleReportAnswerEvent = async (oldItem: DynamoItem, newItem: DynamoItem) => {
    if (!(isAnswerItem(oldItem) && isAnswerItem(newItem))) {
        console.log('Not an answer item, ignoring');
        return;
    }

    const oldAnswerItem = oldItem as AnswerDynamoItem;
    const newAnswerItem = newItem as AnswerDynamoItem;

    if (oldAnswerItem.Strikes.length === newAnswerItem.Strikes.length) {
        console.log('Not a strike event. Ignoring');
        return;
    }

    if (newAnswerItem.Strikes.length < 1) {
        console.log('Not enough strikes to re calculate scores');
        return;
    }

    const userGames = await dynamoDao.getItemsByIndexAndSortKey({
        indexName: dynamoDao.PRIMARY_KEY,
        indexValue: newAnswerItem.GameId
    }, {
        sortKeyName: dynamoDao.PRIMARY_SORT_KEY,
        sortKeyPrefix: gameManager.createGameItemSortKey() 
    }) as gameManager.GameItemDynamoDB[];

    console.log("All users in game: " + JSON.stringify(userGames));

    const gameScore = await scoreCalculator.calculate(
        newAnswerItem.GameId, 
        newAnswerItem.Round, 
        userGames);

    console.log("Calculated Gamescore " + JSON.stringify(gameScore));

    gameManager.updateScores(
        gameScore,
        newAnswerItem.GameId,
        ...userGames.map(item => item.UserId));
}

const isAnswerItem = (item: DynamoItem) => {
    return item.SortKey.startsWith(AnswerPrefix);
}
