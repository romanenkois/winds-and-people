use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn greet() -> String {
    "hello rust".to_string()
}

#[wasm_bindgen]
pub fn generateMap() {
    "Generated Map Data".to_string()
}

// pub getMap()

// var map;
// var isMapReady;
