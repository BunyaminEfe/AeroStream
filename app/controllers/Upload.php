<?php

class Upload extends Controller {
    public function index() {
        if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_FILES['model'])) {
            $file = $_FILES['model'];
            $fileName = basename($file['name']);
            $fileTmpPath = $file['tmp_name'];
            $fileSize = $file['size'];
            $fileError = $file['error'];

            $fileExt = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
            $allowed = ['glb', 'gltf'];

            if (in_array($fileExt, $allowed)) {
                if ($fileError === 0) {
                    if ($fileSize < 500000000) { // 500MB limit
                        $newFileName = uniqid('', true) . "." . $fileExt;
                        $fileDestination = 'uploads/' . $newFileName;

                        if (move_uploaded_file($fileTmpPath, $fileDestination)) {
                            echo json_encode([
                                'status' => 'success',
                                'message' => 'Model uploaded successfully',
                                'path' => '/rüzgar/uploads/' . $newFileName
                            ]);
                        } else {
                            echo json_encode(['status' => 'error', 'message' => 'Failed to move uploaded file.']);
                        }
                    } else {
                        echo json_encode(['status' => 'error', 'message' => 'File is too big.']);
                    }
                } else {
                    echo json_encode(['status' => 'error', 'message' => 'There was an error uploading your file.']);
                }
            } else {
                echo json_encode(['status' => 'error', 'message' => 'Invalid file type. Only GLB/GLTF allowed.']);
            }
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Invalid request.']);
        }
    }
}
