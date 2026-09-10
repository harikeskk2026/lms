package com.careerlabs.lms.api.placement.service;

import com.careerlabs.lms.api.common.storage.LoadedFile;

public record DocumentDownload(LoadedFile file, String fileName) {
}