import { DUNGEON_URLS } from '../../consts';
import { DungeonName } from '../../enums';


/**
 * Converts a given dungeon name to its corresponding URL.
 *
 * @param dungeonName - The name of the dungeon to be converted.
 * @returns The URL corresponding to the given dungeon name.
 */
export const convertDungeonName = (dungeonName: DungeonName): string => {
	console.debug(`convertDungeonName called with dungeonName: ${dungeonName}`);

	const url = getDungeonURL(dungeonName);
	console.debug(`URL obtained from getDungeonURL: ${url}`);

	return url;
};

/**
 * Retrieves the embed color for a given dungeon name.
 *
 * @param dungeonName - The name of the dungeon for which to get the embed color.
 * @returns The embed color as a string.
 */
export const getEmbedColor = (dungeonName: DungeonName): string => {
	console.debug(`getEmbedColor called with dungeonName: ${dungeonName}`);

	const dungeonKey = getDungeonKeyByName(dungeonName);
	console.debug(`Dungeon key obtained in getEmbedColor: ${dungeonKey}`);

	const borderColor = DUNGEON_URLS.find(d => d.key === dungeonKey)?.borderColor ?? '#DCB106';
	console.debug(`Border color found in getEmbedColor: ${borderColor}`);

	return borderColor;
};

/**
 * Retrieves the URL for a given dungeon name.
 *
 * @param dungeonName - The name of the dungeon for which to get the URL.
 * @returns The URL corresponding to the given dungeon name.
 */
const getDungeonURL = (dungeonName: DungeonName): string => {
	console.debug(`getDungeonURL called with dungeonName: ${dungeonName}`);

	const dungeonKey = getDungeonKeyByName(dungeonName);
	console.debug(`Dungeon key obtained in getDungeonURL: ${dungeonKey}`);

	const url = DUNGEON_URLS.find(d => d.key === dungeonKey)?.url ?? DUNGEON_URLS.find(d => d.key === 'ANY')?.url;
	console.debug(`URL found in getDungeonURL: ${url}`);

	return url ?? '';
};


/**
 * Retrieves the key of a dungeon name from the DungeonName enum.
 *
 * @param dungeonName - The name of the dungeon to find the key for.
 * @returns The key corresponding to the provided dungeon name, or 'ANY' if no match is found.
 */
const getDungeonKeyByName = (dungeonName: DungeonName): keyof typeof DungeonName => {
	console.debug(`getDungeonKeyByName called with dungeonName: ${dungeonName}`);

	const key = (Object.keys(DungeonName) as Array<keyof typeof DungeonName>).find(
		(dungeonKey) => DungeonName[dungeonKey] === dungeonName,
	);

	console.debug(`Key found in getDungeonKeyByName: ${key}`);
	return key ?? 'ANY';
};