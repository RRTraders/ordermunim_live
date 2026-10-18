import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:cookie_jar/cookie_jar.dart';
import 'package:dio_cookie_manager/dio_cookie_manager.dart';
import 'package:path_provider/path_provider.dart';

class MeeshoApiService {
  final String accountId;
  late final Dio _dio;
  late final PersistCookieJar _cookieJar;
  bool _isInitialized = false;

  MeeshoApiService({required this.accountId});

  Future<void> init() async {
    if (_isInitialized) return;
    final appDocDir = await getApplicationDocumentsDirectory();
    final cookiePath = '${appDocDir.path}/meesho_cookies_$accountId';

    _cookieJar = PersistCookieJar(storage: FileStorage(cookiePath));
    _dio = Dio(
      BaseOptions(
        baseUrl: 'https://supplier.meesho.com',
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 15),
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'User-Agent':
              'Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
          'Origin': 'https://supplier.meesho.com',
          'Referer': 'https://supplier.meesho.com/panel/v3/new/root/login',
        },
      ),
    );

    _dio.interceptors.add(CookieManager(_cookieJar));
    _isInitialized = true;
  }

  /// 1. Direct Instant Login (200ms)
  Future<Map<String, dynamic>> login({
    required String identifier,
    required String password,
  }) async {
    await init();
    try {
      final response = await _dio.post(
        '/api/container/user/v2-login',
        data: {'identifier': identifier, 'password': password},
        options: Options(contentType: Headers.jsonContentType),
      );

      if (response.statusCode == 200) {
        return {'success': true, 'data': response.data};
      }
      return {
        'success': false,
        'message': response.data?['message'] ?? 'Login failed (${response.statusCode})',
      };
    } on DioException catch (e) {
      return {
        'success': false,
        'message': e.response?.data?['message'] ?? e.message ?? 'Network error',
      };
    }
  }

  /// 2. Fetch Supplier Display Brand Name (e.g. "Kaanchan Export 1")
  Future<Map<String, dynamic>> getSupplierDetails() async {
    await init();
    try {
      final response = await _dio.get('/api/container/supplier/getSupplierDetails');
      if (response.statusCode == 200) {
        return {'success': true, 'data': response.data};
      }
      return {'success': false, 'message': 'Failed to fetch details'};
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  /// 3. Fetch Live Return Delivery OTPs (150ms)
  Future<Map<String, dynamic>> fetchDeliveryOTPs() async {
    await init();
    try {
      final response = await _dio.post(
        '/api/fulfillment/returnRto/fetchDeliveryOTPs',
        data: {},
      );
      if (response.statusCode == 200) {
        return {'success': true, 'data': response.data};
      }
      return {'success': false, 'message': 'Failed to fetch OTPs'};
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  /// 4. Fetch Return / RTO Overview
  Future<Map<String, dynamic>> fetchReturnOverview() async {
    await init();
    try {
      final response = await _dio.post(
        '/fulfillmentapi/api/returnRto/fetchOverviewV2',
        data: {},
      );
      if (response.statusCode == 200) {
        return {'success': true, 'data': response.data};
      }
      return {'success': false, 'message': 'Failed to fetch overview'};
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  /// 5. Accept Pending Orders (Auto moves orders to Ready to Ship)
  Future<Map<String, dynamic>> acceptPendingOrders({List<String>? orderIds}) async {
    await init();
    try {
      final payload = orderIds != null ? {'order_ids': orderIds} : {};
      final response = await _dio.post(
        '/api/fulfillment/orders/updatePendingOrderStatus',
        data: payload,
      );
      return {'success': response.statusCode == 200, 'data': response.data};
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  /// 6. Midnight Label Batch Generation (Bypasses daytime throttle)
  Future<Map<String, dynamic>> reqDownloadLabelV2({
    required List<String> orderIds,
  }) async {
    await init();
    try {
      final response = await _dio.post(
        '/api/fulfillment/orders/reqDownloadLabelV2',
        data: {'order_ids': orderIds},
      );
      return {'success': response.statusCode == 200, 'data': response.data};
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  /// 7. Fetch Downloaded Labels History / URLs
  Future<Map<String, dynamic>> fetchLabelDownloadHistory() async {
    await init();
    try {
      final response = await _dio.get(
        '/api/fulfillment/orders/fetchLabelDownloadHistory',
      );
      return {'success': response.statusCode == 200, 'data': response.data};
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  /// 8. Payouts & Next 7 Days Payments Data
  Future<Map<String, dynamic>> fetchPaymentsData() async {
    await init();
    try {
      final response = await _dio.get('/api/payouts/payments/all-ui-data');
      if (response.statusCode == 200) {
        return {'success': true, 'data': response.data};
      }
      return {'success': false, 'message': 'Failed to fetch payments'};
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }
}
