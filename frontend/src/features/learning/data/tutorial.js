// Tutorials are listed in progression order; each includes its challenge and ordered steps.
export default [
	{
		id: 'variables-introduction',
		title: 'Introduction to Variables',
		challenge: {
			id: 'variables-challenge',
			title: 'Variables Challenge',
			description: 'Create a variable named gold with a value of 100, add 25 to it, then print gold.',
			starterCode: '',
			checks: {
				variables: {
					gold: 125,
				},
				printedVariables: ['gold'],
				output: '125',
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
	},
	{
		id: 'strings-introduction',
		title: 'Introduction to Strings',
		challenge: {
			id: 'strings-challenge',
			title: 'Strings Challenge',
			description: 'Create a variable named kingdom with the value "Code Kingdom", then print it.',
			starterCode: '',
			checks: {
				variables: {
					kingdom: 'Code Kingdom',
				},
				printedVariables: ['kingdom'],
				output: 'Code Kingdom',
			},
		},
		steps: [
			{
				title: 'Storing Text',
				explanation: 'Strings store text. Put quotes around text when assigning it to a variable.',
				code: 'kingdom = "Code Kingdom"\nprint(kingdom)',
			},
		],
	},
	{
		id: 'arithmetic-introduction',
		title: 'Working with Numbers',
		challenge: {
			id: 'arithmetic-challenge',
			title: 'Kingdom Treasury',
			description: 'Your kingdom has 100 gold and earns 25 more. Store the total in a variable named gold, then print it.',
			starterCode: '',
			checks: {
				variables: {gold: 125},
				printedVariables: ['gold'],
				output: '125',
			},
		},
		steps: [
			{
				title: 'Adding Resources',
				explanation: 'Use + to add numbers. Python calculates the expression before storing its result.',
				code: 'gold = 100 + 25\nprint(gold)',
			},
			{
				title: 'Spending Resources',
				explanation: 'Use - to subtract numbers. You can use the current value of a variable when calculating its new value.',
				code: 'gold = 150\ngold = gold - 25\nprint(gold)',
			},
		],
	},
	{
		id: 'joining-strings',
		title: 'Joining Strings',
		challenge: {
			id: 'joining-strings-challenge',
			title: 'Welcome to the Kingdom',
			description: 'Store the text "Welcome to Code Kingdom" in a variable named greeting, then print it.',
			starterCode: '',
			checks: {
				variables: {greeting: 'Welcome to Code Kingdom'},
				printedVariables: ['greeting'],
				output: 'Welcome to Code Kingdom',
			},
		},
		steps: [
			{
				title: 'Combining Text',
				explanation: 'Use + to join strings. Include spaces inside the quotes wherever you want spaces in the result.',
				code: 'greeting = "Welcome to " + "Code Kingdom"\nprint(greeting)',
			},
			{
				title: 'Using a Kingdom Name',
				explanation: 'You can join text with a variable that already contains a string.',
				code: 'kingdom = "Code Kingdom"\ngreeting = "Welcome to " + kingdom\nprint(greeting)',
			},
		],
	},
	{
		id: 'comparisons-introduction',
		title: 'Comparing Values',
		challenge: {
			id: 'comparisons-challenge',
			title: 'Can You Afford a Tower?',
			description: 'You have 100 gold and a tower costs 75. Store whether your gold is greater than or equal to the cost in can_build, then print can_build.',
			starterCode: '',
			checks: {
				variables: {can_build: true},
				printedVariables: ['can_build'],
				output: 'True',
			},
		},
		steps: [
			{
				title: 'True or False',
				explanation: 'A comparison produces True or False in Python. Use == to compare values; a single = assigns a value.',
				code: 'gold = 100\nis_full = gold == 100\nprint(is_full)',
			},
			{
				title: 'Checking a Resource Requirement',
				explanation: 'Use >= to check whether one number is greater than or equal to another.',
				code: 'gold = 100\ncost = 75\ncan_build = gold >= cost\nprint(can_build)',
			},
		],
	},
]
