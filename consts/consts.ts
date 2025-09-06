// export const SG_DEV_SERVER_ID = '771934233110773811';
// export const SG_PROD_SERVER_ID = '171797913364725765';
export const DEV_SERVER_ID = '1146675634270109788';

export const TIME_ZONE_MAPPING: Record<string, string> = {
	EST: 'America/New_York',
	EDT: 'America/New_York',
	CST: 'America/Chicago',
	CDT: 'America/Chicago',
	MST: 'America/Denver',
	MDT: 'America/Denver',
	PST: 'America/Los_Angeles',
	PDT: 'America/Los_Angeles',
	AKST: 'America/Anchorage',
	AKDT: 'America/Anchorage',
	HST: 'Pacific/Honolulu',
};

export const DUNGEON_URLS = [
	// The War Within Season 3 Dungeons (2024-2025)
	{ key: 'OPERATION_FLOODGATE', url: 'https://wow.zamimg.com/images/wow/journal/ui-ej-boss-geezle-gigazap.png', backupUrl: 'https://wow.zamimg.com/images/wow/journal/ui-ej-boss-default.png', borderColor: '#500505' },
	{ key: 'CINDERBREW_MEADERY', url: 'https://wow.zamimg.com/images/wow/journal/ui-ej-boss-goldie-baronbottom.png', backupUrl: 'https://wow.zamimg.com/images/wow/journal/ui-ej-boss-default.png', borderColor: '#77853D' },
	{ key: 'THE_ROOKERY', url: 'https://wow.zamimg.com/images/wow/journal/ui-ej-boss-voidstone-monstrosity.png', backupUrl: 'https://wow.zamimg.com/images/wow/journal/ui-ej-boss-default.png', borderColor: '#7C8A9F' },
	{ key: 'DARKFLAME_CLEFT', url: 'https://wow.zamimg.com/images/wow/journal/ui-ej-boss-the-darkness.png', backupUrl: 'https://wow.zamimg.com/images/wow/journal/ui-ej-boss-default.png', borderColor: '#2C2A41' },
	{ key: 'PRIORY_OF_THE_SACRED_FLAME', url: 'https://wow.zamimg.com/images/wow/journal/ui-ej-boss-prioress-murrpray.png', backupUrl: 'https://wow.zamimg.com/images/wow/journal/ui-ej-boss-default.png', borderColor: '#CF9B49' },
	
	// Legacy Dungeons (still available in rotation)
	{ key: 'THE_MOTHERLODE', url: 'https://wow.zamimg.com/images/wow/journal/ui-ej-boss-mogulrazdunk.png', backupUrl: 'https://wow.zamimg.com/images/wow/journal/ui-ej-boss-default.png', borderColor: '#65686B' },
	{ key: 'MECHAGON_WORKSHOP', url: 'https://wow.zamimg.com/images/wow/journal/ui-ej-boss-tussle-tonks.png', backupUrl: 'https://wow.zamimg.com/images/wow/journal/ui-ej-boss-default.png', borderColor: '#918333' },
	{ key: 'THEATER_OF_PAIN', url: 'https://wow.zamimg.com/images/wow/journal/ui-ej-boss-kultharok.png', backupUrl: 'https://wow.zamimg.com/images/wow/journal/ui-ej-boss-default.png', borderColor: '#745B74' },
	
	// Generic fallback
	{ key: 'ANY', url: 'https://wow.zamimg.com/images/wow/journal/ui-ej-boss-default.png', backupUrl: 'https://wow.zamimg.com/images/wow/journal/ui-ej-boss-default.png', borderColor: '#DCB106' },
];

// Generic fallback images for when specific dungeon images fail
export const FALLBACK_IMAGES = {
	GENERIC_DUNGEON: 'https://wow.zamimg.com/images/wow/journal/ui-ej-boss-default.png',
	MYTHIC_PLUS: 'https://wow.zamimg.com/images/wow/journal/ui-ej-boss-default.png',
	RAID: 'https://wow.zamimg.com/images/wow/journal/ui-ej-boss-default.png',
	DEFAULT: 'https://wow.zamimg.com/images/wow/journal/ui-ej-boss-default.png'
};

export const SG_PROD_MENTION_CHOICES: Record<string, string> = {
	healer_role: '<@&1281359918330413190>',
	tank_role: '<@&1281359855885750372>',
	dps_role: '<@&1281359999662034945>',
	normal_role: '<@&1281360125419978856>',
	heroic_role: '<@&1281360082726162560>',
	mythic_role: ' <@&1281360042117042247>',
	delve_role: '<@&1281360167778123958>',
};

export const SG_DEV_MENTION_CHOICES: Record<string, string> = {
	healer_role: '<@&1281358200104423529>',
	tank_role: '<@&1281358460079833161>',
	dps_role: '<@&1281358602610937959>',
	normal_role: '<@&1281358751252877385>',
	heroic_role: '<@&1281358691915923517>',
	mythic_role: '<@&1281358645400965180>',
	delve_role: '<@&1281358894014398558>',
};

export const DEV_MENTION_CHOICES: Record<string, string> = {
	healer_role: '<@&1309651837305098340>',
	tank_role: '<@&1309651939553841203>',
	dps_role: '<@&1309652002007154718>',
	normal_role: '<@&1309652114481352744>',
	heroic_role: '<@&1309652087176691814>',
	mythic_role: '<@&1309652053819392151>',
	delve_role: '<@&1309652153312219246>',
};