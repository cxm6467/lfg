import { DUNGEON_URLS } from '../../consts';
import { DungeonName } from '../../enums';

// Main function to convert a dungeon name to its URL
export const convertDungeonName = (dungeonName: DungeonName): string => {
	console.debug(`convertDungeonName called with dungeonName: ${dungeonName}`);

	// Get the URL directly using the dungeon name as the key
	const url = getDungeonURL(dungeonName);
	console.debug(`URL obtained from getDungeonURL: ${url}`);

	return url;
};

// Utility function to get the URL directly from the dungeon name
const getDungeonURL = (dungeonName: DungeonName): string => {
	console.debug(`getDungeonURL called with dungeonName: ${dungeonName}`);

	// Use the dungeonName as the key to access DUNGEON_URLS
	const dungeonKey = getDungeonKeyByName(dungeonName);
	console.debug(`Dungeon key obtained in getDungeonURL: ${dungeonKey}`);

	// Use the dungeonKey to get the URL from the DUNGEON_URLS enum, default to 'ANY' URL if not found
	const url = DUNGEON_URLS[dungeonKey] ?? DUNGEON_URLS.ANY;
	console.debug(`URL found in getDungeonURL: ${url}`);

	return url;
};

// Utility function to get the enum key from the DungeonName value
const getDungeonKeyByName = (dungeonName: DungeonName): keyof typeof DungeonName => {
	console.debug(`getDungeonKeyByName called with dungeonName: ${dungeonName}`);

	// Find the key that corresponds to the given dungeon name
	const key = (Object.keys(DungeonName) as Array<keyof typeof DungeonName>).find(
		(dungeonKey) => DungeonName[dungeonKey] === dungeonName,
	);

	// Return the key if found, otherwise fallback to 'ANY'
	console.debug(`Key found in getDungeonKeyByName: ${key}`);
	return key ?? 'ANY';
};
