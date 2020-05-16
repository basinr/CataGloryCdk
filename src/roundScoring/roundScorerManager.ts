import * as dynamoDao from "../dao/dynamoDao";
import * as scoreCalculator from '../roundScoring/scoreCalculator';
import * as gameManager from '../manager/gameManager';

export interface Score {
    userId: string,
    nickname: string,
    score: number
}

export interface GameScore {
    scores: Score[]
}

export const scoreRound = async (oldItem: dynamoDao.DynamoItem, newItem: dynamoDao.DynamoItem) => {
    console.log("Old item: " + JSON.stringify(oldItem));
    console.log("New item: " + JSON.stringify(newItem));

    if (!isGameItem(newItem)) {
        console.log('Not a game item, ignoring for round scoring');
        return;
    }

    const oldGameItem = oldItem as gameManager.GameItemDynamoDB;
    const newGameItem = newItem as gameManager.GameItemDynamoDB;

    if (!isRoundEndingEvent(oldGameItem, newGameItem)) {
        console.log('Not a round ending event, ignoring for round scoring');
        return;
    }

    const userGames = await dynamoDao.getItemsByIndexAndSortKey({
        indexName: dynamoDao.PRIMARY_KEY,
        indexValue: newGameItem.GameId
    }, {
        sortKeyName: dynamoDao.PRIMARY_SORT_KEY,
        sortKeyPrefix: gameManager.createGameItemSortKey() 
    }) as gameManager.GameItemDynamoDB[];

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

    gameManager.startNewRound(
        newGameItem.GameId,
        newGameItem.Round,
        newGameItem.Scores,
        gameScore,
        ...userGames.map(userGame => userGame.UserId)
    );
};

const isGameItem = (item: dynamoDao.DynamoItem): boolean => {
    return item.SortKey.startsWith(gameManager.createGameItemSortKey());
};

const isRoundEndingEvent = (oldItem: gameManager.GameItemDynamoDB, newItem: gameManager.GameItemDynamoDB) => {
    return newItem.GameState === gameManager.GameStates.Waiting &&
        oldItem.GameState === gameManager.GameStates.Pending;
};

const usersAllDone = (userGames: gameManager.GameItemDynamoDB[]): boolean => {
    const usersNotDone = userGames.filter((item: gameManager.GameItemDynamoDB) =>
        item.GameState === gameManager.GameStates.Pending
    );
 
    usersNotDone.forEach((game: gameManager.GameItemDynamoDB) => {
        console.log("This user has not completed their round " + game.UserId);
    });

    return (usersNotDone.length === 0);
};
