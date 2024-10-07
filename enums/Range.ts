export const RangeChoices = [
	{ name: 'N/A', value: 'N/A' },
	{ name: '0', value: '0' },
	...Array.from({ length: 19 }, (_, i) => {
		const value = (i + 2).toString();
		return { name: value, value: value };
	}),
];