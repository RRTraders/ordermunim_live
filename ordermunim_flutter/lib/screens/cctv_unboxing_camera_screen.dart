import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import 'package:intl/intl.dart';
import 'dart:async';

class CctvUnboxingCameraScreen extends StatefulWidget {
  final String storeName;
  final String? awbNumber;

  const CctvUnboxingCameraScreen({
    super.key,
    required this.storeName,
    this.awbNumber,
  });

  @override
  State<CctvUnboxingCameraScreen> createState() => _CctvUnboxingCameraScreenState();
}

class _CctvUnboxingCameraScreenState extends State<CctvUnboxingCameraScreen> {
  CameraController? _controller;
  bool _isRecording = false;
  String _currentTimestamp = '';
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _initCamera();
    _startTimer();
  }

  void _startTimer() {
    _timer = Timer.periodic(const Duration(milliseconds: 100), (timer) {
      if (mounted) {
        setState(() {
          _currentTimestamp =
              DateFormat('dd-MM-yyyy HH:mm:ss.S').format(DateTime.now());
        });
      }
    });
  }

  Future<void> _initCamera() async {
    final cameras = await availableCameras();
    if (cameras.isEmpty) return;

    _controller = CameraController(
      cameras.first,
      ResolutionPreset.high,
      enableAudio: true,
    );

    await _controller!.initialize();
    if (mounted) setState(() {});
  }

  Future<void> _toggleRecording() async {
    if (_controller == null || !_controller!.value.isInitialized) return;

    if (_isRecording) {
      final file = await _controller!.stopVideoRecording();
      setState(() => _isRecording = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Unboxing Proof Saved: ${file.path}')),
        );
      }
    } else {
      await _controller!.startVideoRecording();
      setState(() => _isRecording = true);
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_controller == null || !_controller!.value.isInitialized) {
      return const Scaffold(
        backgroundColor: Colors.black,
        body: Center(child: CircularProgressIndicator(color: Colors.cyan)),
      );
    }

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          CameraPreview(_controller!),

          // Burnt-In Heads-Up Display (HUD) overlay
          Positioned(
            top: 40,
            left: 16,
            right: 16,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.65),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.cyan.withOpacity(0.5)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'STORE: ${widget.storeName.toUpperCase()}',
                        style: const TextStyle(
                          color: Colors.amber,
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                        ),
                      ),
                      Row(
                        children: [
                          Container(
                            width: 8,
                            height: 8,
                            decoration: BoxDecoration(
                              color: _isRecording ? Colors.red : Colors.green,
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            _isRecording ? 'REC' : 'LIVE',
                            style: TextStyle(
                              color: _isRecording ? Colors.red : Colors.green,
                              fontWeight: FontWeight.bold,
                              fontSize: 11,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'IST: $_currentTimestamp',
                    style: const TextStyle(
                      color: Colors.white,
                      fontFamily: 'monospace',
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
                  if (widget.awbNumber != null && widget.awbNumber!.isNotEmpty)
                    Text(
                      'AWB: ${widget.awbNumber}',
                      style: const TextStyle(color: Colors.cyanAccent, fontSize: 11),
                    ),
                ],
              ),
            ),
          ),

          // Record Button
          Positioned(
            bottom: 30,
            left: 0,
            right: 0,
            child: Center(
              child: FloatingActionButton.large(
                backgroundColor: _isRecording ? Colors.red : Colors.cyan,
                onPressed: _toggleRecording,
                child: Icon(
                  _isRecording ? Icons.stop : Icons.videocam,
                  color: Colors.black,
                  size: 36,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
