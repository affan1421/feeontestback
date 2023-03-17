/* eslint-disable no-multi-assign */
/* eslint-disable no-undef */
const FeeSchedule = require('../../models/feeSchedule');
const {
	create,
	getAll,
	getFeeSchedule,
	update,
	deleteFeeSchedule,
} = require('../../controller/feeSchedule');
const ErrorResponse = require('../../utils/errorResponse');
const SuccessResponse = require('../../utils/successResponse');

jest.mock('../../models/feeSchedule');
jest.mock('../../utils/errorResponse');
jest.mock('../../utils/successResponse');

beforeAll(() => {
	jest.clearAllMocks();
});

const mockRequest = () => ({
	body: {},
	params: {},
	query: {},
});

const mockResponse = () => ({
	status: jest.fn().mockReturnThis(),
	json: jest.fn().mockReturnThis(),
});

const mockNext = jest.fn();

describe('Fee Schedule Controller', () => {
	describe('Create Fee Schedule', () => {
		// all required fields are provided 422
		it('should return 422 if all required fields are not provided', async () => {
			const req = (mockRequest().body = {
				body: {
					scheduleName: 'Test Schedule',
					scheduleType: 'Monthly',
					startDate: '2023-04-30T18:30:00.000Z',
					endDate: '2024-02-29T18:30:00.000Z',
					// schoolId: '5f9f1b9b9c9d440000a1b0f1',
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
		// fee schedule already exists 400
		it('should return 400 if fee schedule already exists', async () => {
			const req = (mockRequest().body = {
				body: {
					scheduleName: 'Test Schedule',
					scheduleType: 'Monthly',
					startDate: '2023-04-30T18:30:00.000Z',
					endDate: '2024-03-29T18:30:00.000Z',
					schoolId: '5f9f1b9b9c9d440000a1b0f1',
					interval: 5,
				},
			});
			const res = mockResponse();
			jest.spyOn(FeeSchedule, 'findOne').mockResolvedValueOnce(true);
			await create(req, res, mockNext);
			expect(mockNext).toHaveBeenCalled();
			expect(ErrorResponse).toHaveBeenCalledWith(
				'Fee Schedule Already Exists',
				400
			);
		});
		// fee schedule created successfully 201
		it('should return 201 if fee schedule created successfully', async () => {
			const req = (mockRequest().body = {
				body: {
					scheduleName: 'Test Schedule',
					scheduleType: 'Monthly',
					startDate: '2023-04-30T18:30:00.000Z',
					endDate: '2024-03-29T18:30:00.000Z',
					schoolId: '5f9f1b9b9c9d440000a1b0f1',
					interval: 5,
				},
			});
			const res = mockResponse();
			jest.spyOn(FeeSchedule, 'create').mockResolvedValue({
				scheduleName: 'Test Schedule',
				scheduleType: 'Monthly',
				startDate: '2023-04-30T18:30:00.000Z',
				endDate: '2024-03-29T18:30:00.000Z',
				schoolId: '5f9f1b9b9c9d440000a1b0f1',
				scheduleDates: [
					'2023-04-30T18:30:00.000Z',
					'2023-09-30T18:30:00.000Z',
					'2024-02-29T18:30:00.000Z',
				],
				interval: 5,
				createdAt: '2020-11-03T18:30:00.000Z',
				updatedAt: '2020-11-03T18:30:00.000Z',
			});
			await create(req, res, mockNext);
			expect(res.status).toHaveBeenCalledWith(201);
			expect(SuccessResponse).toHaveBeenCalledWith(
				{
					scheduleName: 'Test Schedule',
					scheduleType: 'Monthly',
					startDate: '2023-04-30T18:30:00.000Z',
					endDate: '2024-03-29T18:30:00.000Z',
					schoolId: '5f9f1b9b9c9d440000a1b0f1',
					scheduleDates: [
						'2023-04-30T18:30:00.000Z',
						'2023-09-30T18:30:00.000Z',
						'2024-02-29T18:30:00.000Z',
					],
					interval: 5,
					createdAt: '2020-11-03T18:30:00.000Z',
					updatedAt: '2020-11-03T18:30:00.000Z',
				},
				1,
				'Created Successfully'
			);
		});
	});
	describe('Get All Fee Schedules', () => {
		// no fee schedules found 404
		it('should return 404 if no fee schedules found', async () => {
			const req = (mockRequest().query = {
				query: {
					schoolId: '5f9f1b9b9c9d440000a1b0f1',
					scheduleType: 'Monthly',
					page: 0,
					limit: 10,
				},
			});
			const res = mockResponse();
			jest.spyOn(FeeSchedule, 'aggregate').mockResolvedValueOnce([
				{
					data: [],
					docCount: {
						length: 0,
					},
				},
			]);
			await getAll(req, res, mockNext);
			expect(mockNext).toHaveBeenCalled();
			expect(ErrorResponse).toHaveBeenCalledWith(
				'Fee Schedules Not Found',
				404
			);
		});
		// get all fee schedules successfully 200
		it('should return 200 if get all fee schedules successfully', async () => {
			const req = (mockRequest().query = {
				query: {
					schoolId: '5f9f1b9b9c9d440000a1b0f1',
					scheduleType: 'Monthly',
					page: 0,
					limit: 10,
				},
			});
			const res = mockResponse();
			const mockData = [
				{
					docCount: [{ count: 2 }],
					data: [
						{
							scheduleName: 'Test Schedule',
							scheduleType: 'Monthly',
							startDate: '2023-04-30T18:30:00.000Z',
							endDate: '2024-03-29T18:30:00.000Z',
							schoolId: '5f9f1b9b9c9d440000a1b0f1',
							scheduleDates: [
								'2023-04-30T18:30:00.000Z',
								'2023-09-30T18:30:00.000Z',
								'2024-02-29T18:30:00.000Z',
							],
							interval: 5,
							createdAt: '2020-11-03T18:30:00.000Z',
							updatedAt: '2020-11-03T18:30:00.000Z',
						},
						{
							scheduleName: 'Test Schedule',
							scheduleType: 'Monthly',
							startDate: '2023-04-30T18:30:00.000Z',
							endDate: '2024-03-29T18:30:00.000Z',
							schoolId: '5f9f1b9b9c9d440000a1b0f1',
							scheduleDates: [
								'2023-04-30T18:30:00.000Z',
								'2023-09-30T18:30:00.000Z',
								'2024-02-29T18:30:00.000Z',
							],
							interval: 5,
							createdAt: '2020-11-03T18:30:00.000Z',
							updatedAt: '2020-11-03T18:30:00.000Z',
						},
					],
				},
			];
			jest.spyOn(FeeSchedule, 'aggregate').mockResolvedValueOnce(mockData);
			await getAll(req, res, mockNext);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(SuccessResponse).toHaveBeenCalledWith(
				[
					{
						scheduleName: 'Test Schedule',
						scheduleType: 'Monthly',
						startDate: '2023-04-30T18:30:00.000Z',
						endDate: '2024-03-29T18:30:00.000Z',
						schoolId: '5f9f1b9b9c9d440000a1b0f1',
						scheduleDates: [
							'2023-04-30T18:30:00.000Z',
							'2023-09-30T18:30:00.000Z',
							'2024-02-29T18:30:00.000Z',
						],
						interval: 5,
						createdAt: '2020-11-03T18:30:00.000Z',
						updatedAt: '2020-11-03T18:30:00.000Z',
					},
					{
						scheduleName: 'Test Schedule',
						scheduleType: 'Monthly',
						startDate: '2023-04-30T18:30:00.000Z',
						endDate: '2024-03-29T18:30:00.000Z',
						schoolId: '5f9f1b9b9c9d440000a1b0f1',
						scheduleDates: [
							'2023-04-30T18:30:00.000Z',
							'2023-09-30T18:30:00.000Z',
							'2024-02-29T18:30:00.000Z',
						],
						interval: 5,
						createdAt: '2020-11-03T18:30:00.000Z',
						updatedAt: '2020-11-03T18:30:00.000Z',
					},
				],
				2,
				'Fetched Successfully'
			);
		});
	});
	describe('Get Fee Schedule By Id', () => {
		// fee schedule not found 404
		it('should return 404 if fee schedule not found', async () => {
			const req = (mockRequest().params = {
				params: '5f9f1b9b9c9d440000a1b0f1',
			});
			const res = mockResponse();
			jest.spyOn(FeeSchedule, 'findById').mockResolvedValueOnce(null);
			await getFeeSchedule(req, res, mockNext);
			expect(mockNext).toHaveBeenCalled();
			expect(ErrorResponse).toHaveBeenCalledWith('Fee Schedule Not Found', 404);
		});
		// get fee schedule by id successfully 200
		it('should return 200 if get fee schedule by id successfully', async () => {
			const req = (mockRequest().params = {
				params: '5f9f1b9b9c9d440000a1b0f1',
			});
			const res = mockResponse();
			const mockFeeSchedule = {
				scheduleName: 'Test Schedule',
				scheduleType: 'Monthly',
				startDate: '2023-04-30T18:30:00.000Z',
				endDate: '2024-03-29T18:30:00.000Z',
				schoolId: '5f9f1b9b9c9d440000a1b0f1',
				scheduleDates: [
					'2023-04-30T18:30:00.000Z',
					'2023-09-30T18:30:00.000Z',
					'2024-02-29T18:30:00.000Z',
				],
				interval: 5,
				createdAt: '2020-11-03T18:30:00.000Z',
				updatedAt: '2020-11-03T18:30:00.000Z',
			};
			jest
				.spyOn(FeeSchedule, 'findById')
				.mockResolvedValueOnce(mockFeeSchedule);
			await getFeeSchedule(req, res, mockNext);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(SuccessResponse).toHaveBeenCalledWith(
				mockFeeSchedule,
				1,
				'Fetched Successfully'
			);
		});
	});
	describe('Update Fee Schedule', () => {
		// fee schedule not found 404
		it('should return 404 if fee schedule not found', async () => {
			const req = (mockRequest().params = {
				params: '5f9f1b9b9c9d440000a1b0f1',
			});
			const res = mockResponse();
			jest.spyOn(FeeSchedule, 'findById').mockResolvedValueOnce(null);
			await update(req, res, mockNext);
			expect(mockNext).toHaveBeenCalled();
			expect(ErrorResponse).toHaveBeenCalledWith('Fee Schedule Not Found', 404);
		});
		// update fee schedule successfully 200
		it('should return 200 if update fee schedule successfully', async () => {
			const req = (mockRequest().params = {
				params: '5f9f1b9b9c9d440000a1b0f1',
			});
			const res = mockResponse();
			const mockFeeSchedule = {
				scheduleName: 'Test Schedule',
				scheduleType: 'Monthly',
				startDate: '2023-04-30T18:30:00.000Z',
				endDate: '2024-03-29T18:30:00.000Z',
				schoolId: '5f9f1b9b9c9d440000a1b0f1',
				scheduleDates: [
					'2023-04-30T18:30:00.000Z',
					'2023-09-30T18:30:00.000Z',
					'2024-02-29T18:30:00.000Z',
				],
				interval: 5,
				createdAt: '2020-11-03T18:30:00.000Z',
				updatedAt: '2020-11-03T18:30:00.000Z',
			};
			jest
				.spyOn(FeeSchedule, 'findByIdAndUpdate')
				.mockResolvedValueOnce(mockFeeSchedule);
			await update(req, res, mockNext);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(SuccessResponse).toHaveBeenCalledWith(
				mockFeeSchedule,
				1,
				'Updated Successfully'
			);
		});
	});
	describe('Delete Fee Schedule', () => {
		// fee schedule not found 404
		it('should return 404 if fee schedule not found', async () => {
			const req = (mockRequest().params = {
				params: '5f9f1b9b9c9d440000a1b0f1',
			});
			const res = mockResponse();
			jest.spyOn(FeeSchedule, 'findByIdAndDelete').mockResolvedValueOnce(null);
			await deleteFeeSchedule(req, res, mockNext);
			expect(mockNext).toHaveBeenCalled();
			expect(ErrorResponse).toHaveBeenCalledWith('Fee Schedule Not Found', 404);
		});
		// delete fee schedule successfully 200
		it('should return 200 if delete fee schedule successfully', async () => {
			const req = (mockRequest().params = {
				params: '5f9f1b9b9c9d440000a1b0f1',
			});
			const res = mockResponse();
			jest.spyOn(FeeSchedule, 'findByIdAndDelete').mockResolvedValueOnce(true);
			await deleteFeeSchedule(req, res, mockNext);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(SuccessResponse).toHaveBeenCalledWith(
				null,
				1,
				'Deleted Successfully'
			);
		});
	});
});
