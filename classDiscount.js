const classDiscount = {
	section: {
		id: '5f8b4a3d4e5e9d1b9c0c7d4a', // query and grouping
		sectionName: '1st - A',
	}, // query and grouping
	discount: {
		id: '5f8b4a3d4e5e9d1b9c0c7d4b', // query
		discountName: 'Sibling Discount',
	}, // query
	schoolId: '5f8b4a3d4e5e9d1b9c0c7d4c', // query
	categoryId: '5f8b4a3d4e5e9d1b9c0c7d4d', // query
	feeStructureId: '5f8b4a3d4e5e9d1b9c0c7d4e', // query
	totalFeesAmount: 20000,
	totalStudents: 100,
	totalApproved: 70,
	totalPending: 30,
	totalDiscountAmount: 3500,
	totalApprovedAmount: 5000,
};

const discountStructure = {
	schoolId: '5f8b4a3d4e5e9d1b9c0c7d4c', // query
	categoryId: '5f8b4a3d4e5e9d1b9c0c7d4d', // query
	feeStructureId: '5f8b4a3d4e5e9d1b9c0c7d4e', // query
	sectionId: '5f8b4a3d4e5e9d1b9c0c7d4c', // query
	discountId: '5f8b4a3d4e5e9d1b9c0c7d4d', // query
	totalFeesAmount: 20000,
	totalDiscountAmount: 3500,
	feeDetails: [
		{
			feeType: {
				_id: '5f8b4a3d4e5e9d1b9c0c7d4f',
				name: 'Admission Fee',
			},
			amount: 10000,
			isPercentage: true,
			value: 10,
			discountAmount: 1000,
			breakdown: [
				{
					date: '2023-05-10T00:00:00.000Z',
					amount: 5000,
					value: 5,
				},
				{
					date: '2023-08-10T00:00:00.000Z',
					amount: 5000,
					value: 5,
				},
			],
		},
		{
			feeType: {
				_id: '5f8b4a3d4e5e9d1b9c0c7d50',
				name: 'Tuition Fee',
			},
			amount: 10000,
			isPercentage: false,
			value: 2500,
			discountAmount: 2500,
			breakdown: [
				{
					date: '2023-05-10T00:00:00.000Z',
					amount: 5000,
					value: 1500,
				},
				{
					date: '2023-08-10T00:00:00.000Z',
					amount: 5000,
					value: 1000,
				},
			],
		},
	],
};

const graphData = [
	{
		_id: '5f8b4a3d4e5e9d1b9c0c7d4a',
		sectionName: '1st - A',
		totalDiscountAmount: 20000,
	},
];

const classes = [
	{
		_id: '5f8b4a3d4e5e9d1b9c0c7d4a',
		sectionName: '1st - A',
		totalDiscountAmount: 20000,
		discounts: [
			{
				_id: '5f8b4a3d4e5e9d1b9c0c7d4b',
				name: 'Sibling Discount',
				amount: 10000,
				totalApproved: 70,
				totalPending: 30,
			},
			{
				_id: '5f8b4a3d4e5e9d1b9c0c7d4b',
				name: 'Teacher Discount',
				amount: 10000,
				totalApproved: 70,
				totalPending: 30,
			},
		],
	},
];

const feeStructure = [
	{
		feeType: {
			_id: '5f8b4a3d4e5e9d1b9c0c7d4f',
			name: 'Admission Fee',
		},
		amount: 10000,
		isPercentage: true,
		value: 10,
		discountAmount: 1000,
		breakdown: [
			{
				date: '2023-05-10T00:00:00.000Z',
				amount: 5000,
				value: 5,
			},
			{
				date: '2023-08-10T00:00:00.000Z',
				amount: 5000,
				value: 5,
			},
		],
	},
];
