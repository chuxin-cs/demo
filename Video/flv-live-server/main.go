package main

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
)

func streamFLV(w http.ResponseWriter, r *http.Request) {
	file, err := os.Open("./flv/202512241446_aac.flv")
	if err != nil {
		http.Error(w, "file not found", http.StatusNotFound)
		return
	}
	defer file.Close()

	stat, _ := file.Stat()
	fileSize := stat.Size()

	// ==== 必要 HTTP 头 ====
	w.Header().Set("Content-Type", "video/x-flv")
	w.Header().Set("Accept-Ranges", "bytes")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	// ==== Range 支持（VLC 很重要）====
	rangeHeader := r.Header.Get("Range")
	if rangeHeader != "" {
		var start int64
		_, err := fmt.Sscanf(rangeHeader, "bytes=%d-", &start)
		if err == nil {
			file.Seek(start, 0)
			w.Header().Set("Content-Range",
				fmt.Sprintf("bytes %d-%d/%d", start, fileSize-1, fileSize))
			w.WriteHeader(http.StatusPartialContent)
		}
	}

	// ==== 核心：直接交给内核 copy ====
	_, err = io.Copy(w, file)
	if err != nil {
		log.Println("client disconnected")
	}
}

func main() {
	http.HandleFunc("/live.flv", streamFLV)
	log.Println("FLV server at http://localhost:8080/live.flv")
	log.Fatal(http.ListenAndServe("localhost:8080", nil))
}
