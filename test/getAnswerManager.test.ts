import * as dynamoDao from '../src/dynamoDao';
import { getQuestions } from '../src/getAnswerManager';
import { QuestionPrefx } from '../src/gameManager';
import { defaultCategories } from '../src/defaultCategories';

describe('getAnswers', () => {
    const sampleGameId = 'game123';
    const sampleRound = 1;
    const sampleLetter = 'a';
    const sampleCategories = defaultCategories[1];

    const getByKeySpy = jest.spyOn(dynamoDao, 'getItemsByIndexAndSortKey');

    afterEach(() => {
        getByKeySpy.mockClear();
    });

    describe('questions exist', () => {
        beforeEach(() => {
            getByKeySpy.mockImplementation((index: dynamoDao.IndexQuery, sort?: dynamoDao.SortKeyQuery) =>
                Promise.resolve([{
                    Letter: sampleLetter,
                    Categories: sampleCategories,
                    Round : sampleRound } as {[key: string]: any; },
                ])
            );
        });
    
        it('calls dao with correct params', async () => {
            await getQuestions(sampleGameId, sampleRound);
    
            expect(getByKeySpy).toHaveBeenCalledTimes(1);
            expect(getByKeySpy).toHaveBeenCalledWith(
                {
                    indexName: dynamoDao.PRIMARY_KEY,
                    indexValue: sampleGameId
                },
                {
                    sortKeyName: dynamoDao.PRIMARY_SORT_KEY,
                    sortKeyPrefix: QuestionPrefx + '|' + sampleRound    
                });
        });
    
        it('resolves with the correct response', async () => {
            await expect(getQuestions(sampleGameId, sampleRound)).resolves.toStrictEqual({
                letter: sampleLetter,
                categories: sampleCategories,
                round: sampleRound
            });
        });    
    })


    describe('not questions exist', () => {
        beforeEach(() => {
            getByKeySpy.mockImplementation((index: dynamoDao.IndexQuery, sort?: dynamoDao.SortKeyQuery) =>
                Promise.resolve([])
            );
        });

        it('throws an exception', async () => {
            await expect(getQuestions(sampleGameId, sampleRound)).rejects.toBeInstanceOf(Error);
        })
    });
});
