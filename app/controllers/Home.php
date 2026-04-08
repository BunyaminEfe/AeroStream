<?php

class Home extends Controller {
    public function index() {
        $data['title'] = 'AeroStream - 3D Rüzgar Simülatörü';
        $this->view('home/index', $data);
    }
}
