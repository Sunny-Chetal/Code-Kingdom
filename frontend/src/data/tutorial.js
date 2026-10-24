// Tutorial identity and the ordered steps used by the navigation.
export default {
	id: 'variables-introduction',
	title: 'Introduction to Variables',
	challenge: {
		id: 'variables-challenge',
		title: 'Variables Challenge',
		description: 'Create a variable named gold with a value of 100, then print it.',
		starterCode: '',
		checks: {
			variables: {
				gold: 100,
			},
			printedVariables: ['gold'],
			output: '100',
		},
	},
	steps: [
		{
			title: 'Introduction to Variables',
			explanation: 'Variables store information in a program. You can use a variable to track how much gold your kingdom has.',
			code: 'gold = 100\nprint(gold)',
		},
		{
			title: 'Updating Variables',
			explanation: 'You can update a variable when its value changes. Here, your kingdom earns 25 gold.',
			code: 'gold = 100\ngold = gold + 25\nprint(gold)',
		},
	],
}