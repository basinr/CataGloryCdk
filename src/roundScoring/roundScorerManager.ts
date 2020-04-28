import * as dynamoDao from "../dao/dynamoDao";
import * as scoreCalculator from '../roundScoring/scoreCalculator';
import * as gameManager from '../manager/gameManager';
import { GamePrefix, GameItemDynamoDB, GameStates } from "../manager/gameManager";

export interface Score {
    userId: string,
    nickname: string,
    score: number
}

export interface GameScore {
    scores: Score[]
}

export const scoreRound = async (newItem: dynamoDao.DynamoItem) => {
    console.log("New item: " + JSON.stringify(newItem));

    if (!isGameItem(newItem)) {
        console.log('Not a game item, ignoring for round scoring');
        return;
    }

    const newGameItem = newItem as GameItemDynamoDB;

    if (!isRoundEndingEvent(newGameItem)) {
        console.log('Not a round ending event, ignoring for round scoring');
        return;
    }

    const userGames = await dynamoDao.getItemsByIndexAndSortKey({
        indexName: dynamoDao.GSI_KEY,
        indexValue: newGameItem.GameId
    }, {
        sortKeyName: dynamoDao.GSI_SORT_KEY,
        sortKeyPrefix: GamePrefix 
    }) as GameItemDynamoDB[];

    console.log("All users in game: " + JSON.stringify(userGames));

    if (!usersAllDone(userGames)) {
        console.log('Not all users are done, ignoring until round is complete');
        return;
    }

    const gameScore = await scoreCalculator.calculate(
        newGameItem.GameId, 
        newGameItem.Round, 
        userGames);

    console.log("Calculated Gamescore " + JSON.stringify(gameScore));

    gameManager.startNewRound(...userGames.map(item => {
        return {
            ...item,
            Scores: gameScore
        }
    }));
};

const isGameItem = (item: dynamoDao.DynamoItem): boolean => {
    return item.SortKey.startsWith(GamePrefix);
};

const isRoundEndingEvent = (newItem: GameItemDynamoDB) => {
    return newItem.State === GameStates.Waiting;
};

const usersAllDone = (userGames: GameItemDynamoDB[]): boolean => {
    const usersNotDone = userGames.filter((item: GameItemDynamoDB) =>
        item.State === GameStates.Pending
    );
 
    usersNotDone.forEach((game: GameItemDynamoDB) => {
        console.log("This user has not completed their round " + game.UserId);
    });

    return (usersNotDone.length === 0);
};
