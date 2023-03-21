/* eslint-disable no-multi-assign */
/* eslint-disable no-undef */
const FeeStructure = require('../../models/feeStructure');
const ErrorResponse = require('../../utils/errorResponse');
const SuccessResponse = require('../../utils/successResponse');
const {
	create,
	read,
	update,
	deleteFeeStructure,
	getByFilter,
} = require('../../controller/feeStructure');

jest.mock('../../models/feeStructure');
jest.mock('../../utils/errorResponse');
jest.mock('../../utils/successResponse');

beforeEach(() => {
	jest.clearAllMocks();
});

const mockRequest = () => ({
	query: {},
	params: {},
	body: {},
});

const mockResponse = () => ({
	status: jest.fn().mockReturnThis(),
	json: jest.fn().mockReturnThis(),
});

const mockNext = jest.fn();

const feeStructureMock = {
	success: true,
	data: {
		feeStructureName: 'Secon  Structure',
		academicYear: '2023-2024',
		schoolId: '5f5f5f5f5f5f5f5f5f5f5f5f',
		classes: [
			{
				name: 'class 1A',
				sectionId: '5f5f5f5f5f5f5f5f5f5f5f5f',
				_id: '64181f16b1c774f84228257b',
			},
		],
		description: 'the description',
		feeDetails: [
			{
				feeTypeId: '5f5f5f5f5f5f5f5f5f5f5f5f',
				scheduleTypeId: '5f5f5f5f5f5f5f5f5f5f5f5f',
				scheduledDates: [
					{
						date: '2023-03-20T04:46:44.263Z',
						amount: 289,
						_id: '64181f16b1c774f84228257d',
					},
					{
						date: '2023-04-20T04:46:44.263Z',
						amount: 289,
						_id: '64181f16b1c774f84228257e',
					},
				],
				totalAmount: 578,
				breakdown: 2,
				_id: '64181f16b1c774f84228257c',
			},
			{
				feeTypeId: '5f5f5f5f5f5f5f5f5f5f5f5f',
				scheduleTypeId: '5f5f5f5f5f5f5f5f5f5f5f5f',
				scheduledDates: [
					{
						date: '2023-03-20T04:46:44.263Z',
						amount: 289,
						_id: '64181f16b1c774f842282580',
					},
					{
						date: '2023-04-20T04:46:44.263Z',
						amount: 289,
						_id: '64181f16b1c774f842282581',
					},
				],
				totalAmount: 578,
				breakdown: 2,
				_id: '64181f16b1c774f84228257f',
			},
		],
		totalAmount: 578,
		_id: '64181f16b1c774f84228257a',
		__v: 0,
	},
	resultCount: 1,
	message: 'Created Successfully',
};

describe('Fee Structure Controller', () => {
	describe('Get by filter', () => {
		// 404 error if fee structure is not found
		it('should return 404 error if fee structure is not found', async () => {
			const req = (mockRequest().query = {
				query: {
					page: 0,
					limit: 10,
				},
			});
			const res = mockResponse();
			jest.spyOn(FeeStructure, 'aggregate').mockResolvedValueOnce([
				{
					data: [],
					count: {
						length: 0,
					},
				},
			]);
			await getByFilter(req, res, mockNext);
			expect(mockNext).toHaveBeenCalled();
			expect(ErrorResponse).toHaveBeenCalledWith(
				'Fee Structure Not Found',
				404
			);
		});
		// 200 success if fee structure is found
		it('should return 200 success if fee structure is found', async () => {
			const req = (mockRequest().query = {
				query: {
					page: 0,
					limit: 10,
				},
			});

			const res = mockResponse();
			jest.spyOn(FeeStructure, 'aggregate').mockResolvedValueOnce([
				{
					data: [feeStructureMock],
					count: [
						{
							count: 1,
						},
					],
				},
			]);
			await getByFilter(req, res, mockNext);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(SuccessResponse).toHaveBeenCalledWith(
				[feeStructureMock],
				1,
				'Fetched Successfully'
			);
		});
	});
	describe('Create', () => {
		// 422 error if required fields are not provided
		it('should return 422 error if required fields are not provided', async () => {
			const req = (mockRequest().body = {
				body: {
					feeStructureName: 'Secon  Structure',
					academicYear: '2023-2024',
					schoolId: '5f5f5f5f5f5f5f5f5f5f5f5f',
					classes: [
						{
							name: 'class 1A',
							sectionId: '5f5f5f5f5f5f5f5f5f5f5f5f',
						},
					],
					description: 'the description',
					feeDetails: [
						{
							feeTypeId: '5f5f5f5f5f5f5f5f5f5f5f5f',
							scheduleTypeId: '5f5f5f5f5f5f5f5f5f5f5f5f',
							scheduledDates: [
								{
									date: '2023-03-20T04:46:44.263Z',
									amount: 289,
								},
							],
						},
					],
				},
			});
			const res = mockResponse();
			await create(req, res, mockNext);
			expect(mockNext).toHaveBeenCalled();
			expect(ErrorResponse).toHaveBeenCalledWith(
				'Please Provide All Required Fields',
				422
			);
		});
		// 400 error if fee structure name already exists
		it('should return 400 error if fee structure name already exists', async () => {
			const req = (mockRequest().body = {
				body: {
					feeStructureName: 'Secon  Structure',
					description: 'the description',
					academicYear: '2023-2024',
					schoolId: '5f5f5f5f5f5f5f5f5f5f5f5f',
					classes: [
						{
							name: 'class 1A',
							sectionId: '5f5f5f5f5f5f5f5f5f5f5f5f',
						},
					],
					feeDetails: [
						{
							feeTypeId: '5f5f5f5f5f5f5f5f5f5f5f5f',
							scheduleTypeId: '5f5f5f5f5f5f5f5f5f5f5f5f',
							scheduledDates: [
								{
									date: '2023-03-20T04:46:44.263Z',
									amount: 289,
								},
								{
									date: '2023-04-20T04:46:44.263Z',
									amount: 289,
								},
							],
							totalAmount: 578,
							breakdown: 2,
						},
						{
							feeTypeId: '5f5f5f5f5f5f5f5f5f5f5f5f',
							scheduleTypeId: '5f5f5f5f5f5f5f5f5f5f5f5f',
							scheduledDates: [
								{
									date: '2023-03-20T04:46:44.263Z',
									amount: 289,
								},
								{
									date: '2023-04-20T04:46:44.263Z',
									amount: 289,
								},
							],
							totalAmount: 578,
							breakdown: 2,
						},
					],
					totalAmount: 578,
				},
			});
			const res = mockResponse();
			jest
				.spyOn(FeeStructure, 'findOne')
				.mockResolvedValueOnce(feeStructureMock);
			await create(req, res, mockNext);
			expect(mockNext).toHaveBeenCalled();
			expect(ErrorResponse).toHaveBeenCalledWith(
				'Fee Structure With This Name Already Exists',
				400
			);
		});
		// 201 success if fee structure is created
		it('should return 201 success if fee structure is created', async () => {
			const req = (mockRequest().body = {
				body: {
					feeStructureName: 'Secon  Structure',
					description: 'the description',
					academicYear: '2023-2024',
					schoolId: '5f5f5f5f5f5f5f5f5f5f5f5f',
					classes: [
						{
							name: 'class 1A',
							sectionId: '5f5f5f5f5f5f5f5f5f5f5f5f',
						},
					],
					feeDetails: [
						{
							feeTypeId: '5f5f5f5f5f5f5f5f5f5f5f5f',
							scheduleTypeId: '5f5f5f5f5f5f5f5f5f5f5f5f',
							scheduledDates: [
								{
									date: '2023-03-20T04:46:44.263Z',
									amount: 289,
								},
								{
									date: '2023-04-20T04:46:44.263Z',
									amount: 289,
								},
							],
							totalAmount: 578,
							breakdown: 2,
						},
						{
							feeTypeId: '5f5f5f5f5f5f5f5f5f5f5f5f',
							scheduleTypeId: '5f5f5f5f5f5f5f5f5f5f5f5f',
							scheduledDates: [
								{
									date: '2023-03-20T04:46:44.263Z',
									amount: 289,
								},
								{
									date: '2023-04-20T04:46:44.263Z',
									amount: 289,
								},
							],
							totalAmount: 578,
							breakdown: 2,
						},
					],
					totalAmount: 578,
				},
			});
			const res = mockResponse();
			jest.spyOn(FeeStructure, 'findOne').mockResolvedValueOnce(null);
			jest
				.spyOn(FeeStructure, 'create')
				.mockResolvedValueOnce(feeStructureMock);
			await create(req, res, mockNext);
			expect(res.status).toHaveBeenCalledWith(201);
			expect(SuccessResponse).toHaveBeenCalledWith(
				feeStructureMock,
				1,
				'Created Successfully'
			);
		});
		// 500 error if something went wrong
	});
	describe('Read', () => {
		// 404 error if fee structure is not found
		// 200 success if fee structure is found
	});
	describe('Update', () => {
		// 422 error if required fields are not provided
		// 400 error if fee structure name already exists
		// 200 success if fee structure is updated
		// 500 error if something went wrong
	});
	describe('Delete', () => {
		// 404 error if fee structure is not found
		// 200 success if fee structure is deleted
		// 500 error if something went wrong
	});
});
