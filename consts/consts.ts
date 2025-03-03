export const SG_DEV_SERVER_ID = '771934233110773811';
export const SG_PROD_SERVER_ID = '171797913364725765';
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
	{ key: 'OPERATION_FLOODGATE', url: '', borderColor: '#44408E' },
	{ key: 'CINDERBREW_MEADERY', url: '', borderColor: '#585281' },
	{ key: 'THE_ROOKERY', url: '', borderColor: '#7C8A9F' },
	{ key: 'DARKFLAME_CLEFT', url: '', borderColor: '#848AA8' },
	{ key: 'PRIORY_OF_THE_SACRED_FLAME', url: '', borderColor: '#6432A5' },
	{ key: 'THE_MOTHERLODE', url: '', borderColor: '#57529A' },
	{ key: 'MECHAGON_WORKSHOP', url: '', borderColor: '#5D717A' },
	{ key: 'THEATER_OF_PAIN', url: '', borderColor: '#4990A9' },
	{ key: 'ANY', url: '', borderColor: '#DCB106' },
];

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