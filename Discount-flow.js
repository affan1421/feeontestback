// To Fetch the student Data:
// GET - localhost:3000/api/v1/feestructure/64da14588369e50bdfa3edd0/student/section/628ca08859d5aef8bc2f0466?page=0&limit=5&searchTerm=nadeem.
const studentList = [
	{
		studentId: '649ab1d62d1413ab12bfd4c2',
		studentName: 'SAYYAD MUHAMMED FALAH',
		totalFees: 15500,
		netFees: 13000,
		totalDiscountAmount: 2500,
		paidAmount: 5000,
		feeDetails: [
			{
				feeType: {
					_id: '5f7b8f8a2d1413ab12bfd4c2',
					name: 'Tution Fee',
				},
				totalFees: 10000,
				netAmount: 7500,
				paidAmount: 5000,
				totalDiscountAmount: 2500,
			},
			{
				feeType: {
					_id: '5f7b8f8a2d1413ab12bfd4c2',
					name: 'Book Fee',
				},
				totalFees: 5500,
				netAmount: 5500,
				paidAmount: 0,
				totalDiscountAmount: 0,
			},
		],
	},
];

// To Fetch the Fee Structure Data:
// GET - localhost:3000/api/v1/feestructure/64da14588369e50bdfa3edd0/feeDetails
const feeDetails = {
	success: true,
	data: [
		{
			feeTypeId: {
				_id: '6457253823b727b3b7d8a0c9',
				feeType: 'Admission Fee',
			},
			scheduleTypeId: '6457255f23b727b3b7d8a0da',
			scheduledDates: [
				{
					date: '2023-05-01T00:00:00.000Z',
					amount: 5000,
					_id: '64da14588369e50bdfa3edd3',
				},
			],
			totalAmount: 5000,
			breakdown: 0,
			_id: '64da14588369e50bdfa3edd2',
		},
		{
			feeTypeId: {
				_id: '646621c2507a1e1f0a70b9a9',
				feeType: 'Book Fees',
			},
			scheduleTypeId: '6457257e23b727b3b7d8a0e1',
			scheduledDates: [
				{
					date: '2023-05-05T00:00:00.000Z',
					amount: 1749.75,
					_id: '64da14588369e50bdfa3edd5',
				},
				{
					date: '2023-08-05T00:00:00.000Z',
					amount: 1749.75,
					_id: '64da14588369e50bdfa3edd6',
				},
				{
					date: '2023-11-05T00:00:00.000Z',
					amount: 1749.75,
					_id: '64da14588369e50bdfa3edd7',
				},
				{
					date: '2024-02-05T00:00:00.000Z',
					amount: 1749.75,
					_id: '64da14588369e50bdfa3edd8',
				},
			],
			totalAmount: 6999,
			breakdown: 0,
			_id: '64da14588369e50bdfa3edd4',
		},
		{
			feeTypeId: {
				_id: '645b241123b727b3b7d8c477',
				feeType: 'Sports fees',
			},
			scheduleTypeId: '6475ea8517550b6b61dcf9a8',
			scheduledDates: [
				{
					date: '2023-06-10T00:00:00.000Z',
					amount: 1666.67,
					_id: '64da14588369e50bdfa3edda',
				},
				{
					date: '2023-08-10T00:00:00.000Z',
					amount: 1666.67,
					_id: '64da14588369e50bdfa3eddb',
				},
				{
					date: '2023-11-10T00:00:00.000Z',
					amount: 1666.67,
					_id: '64da14588369e50bdfa3eddc',
				},
			],
			totalAmount: 5000,
			breakdown: 0,
			_id: '64da14588369e50bdfa3edd9',
		},
	],
	resultCount: 3,
	message: 'Fetched Successfully',
};
