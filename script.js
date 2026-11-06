
/*
 * BASE_URL, buildQuery(params) và ApiError(status, message, body)
 * đã được cung cấp trong starter, không sửa các thành phần này.
*/


// 1. HÀM ÁNH XẠ MÃ HTTP THÀNH THÔNG BÁO TIẾNG VIỆT

function messageForStatus(status) {
  // Xử lý lỗi mất kết nối mạng.
  if (status === 0) {
    return "Không kết nối được tới máy chủ. Hãy kiểm tra mạng và thử lại.";
  }

  // Xử lý lỗi yêu cầu không hợp lệ.
  if (status === 400) {
    return "Yêu cầu không hợp lệ. Hãy kiểm tra lại dữ liệu đã gửi.";
  }

  // Xử lý lỗi chưa đăng nhập hoặc phiên đăng nhập hết hạn.
  if (status === 401) {
    return "Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn.";
  }

  // Xử lý lỗi không có quyền truy cập.
  if (status === 403) {
    return "Bạn không có quyền thực hiện thao tác này.";
  }

  // Xử lý lỗi không tìm thấy tài nguyên.
  if (status === 404) {
    return "Không tìm thấy dữ liệu yêu cầu.";
  }

  // Xử lý các lỗi máy chủ từ 500 đến 599.
  if (status >= 500 && status <= 599) {
    return "Máy chủ gặp sự cố. Hãy thử lại sau.";
  }

  // Trả về thông báo mặc định cho các mã lỗi khác.
  return `Đã xảy ra lỗi (mã ${status}).`;
}


// 2. HÀM REQUEST DÙNG CHUNG ĐỂ GỌI API

async function request(
  url,
  {
    method = "GET",
    headers = {},
    params,
    body,
    signal
  } = {}
) {
  // Nếu URL bắt đầu bằng http thì giữ nguyên địa chỉ.
  // Nếu bắt đầu bằng / thì ghép với BASE_URL.
  let requestUrl = url.startsWith("http")
    ? url
    : BASE_URL + url;

  // Chuyển params thành query string bằng buildQuery().
  const queryString = buildQuery(params);

  // Nếu URL đã có query string thì nối bằng dấu &.
  if (queryString) {
    const separator = requestUrl.includes("?") ? "&" : "?";
    requestUrl += separator + queryString.slice(1);
  }

  // Sao chép headers để không làm thay đổi object gốc.
  const requestHeaders = { ...headers };

  // Xác định body có phải object cần chuyển thành JSON hay không.
  const isJsonBody =
    body !== undefined &&
    body !== null &&
    typeof body === "object" &&
    !(body instanceof FormData);

  // Chuyển object thành chuỗi JSON trước khi gửi.
  const requestBody = isJsonBody
    ? JSON.stringify(body)
    : body;

  // Kiểm tra Content-Type không phân biệt chữ hoa và chữ thường.
  const hasContentType = Object.keys(requestHeaders).some(
    (key) => key.toLowerCase() === "content-type"
  );

  // Thêm Content-Type nếu gửi JSON và người gọi chưa cung cấp.
  if (isJsonBody && !hasContentType) {
    requestHeaders["Content-Type"] = "application/json";
  }

  // Gửi HTTP request đến server.
  let response;

  try {
    response = await fetch(requestUrl, {
      method,
      headers: requestHeaders,
      body: requestBody,
      signal
    });
  } catch (error) {
    // Nếu request bị hủy chủ động thì giữ nguyên AbortError.
    if (error.name === "AbortError") {
      throw error;
    }

    // Các lỗi kết nối khác được chuyển thành ApiError status 0.
    throw new ApiError(
      0,
      messageForStatus(0),
      null
    );
  }

  // Đọc nội dung phản hồi dưới dạng text.
  const responseText = await response.text();

  // Nếu phản hồi rỗng thì dữ liệu trả về là null.
  let responseBody = null;

  // Nếu có nội dung thì thử phân tích JSON.
  if (responseText !== "") {
    try {
      responseBody = JSON.parse(responseText);
    } catch {
      // Nếu không phải JSON thì giữ nguyên nội dung dạng chữ.
      responseBody = responseText;
    }
  }

  // Kiểm tra trạng thái HTTP sau khi đã đọc nội dung phản hồi.
  if (!response.ok) {
    // Ném ApiError chứa mã trạng thái, thông báo và response body.
    throw new ApiError(
      response.status,
      messageForStatus(response.status),
      responseBody
    );
  }

  // Trả về dữ liệu JSON đã phân tích hoặc null nếu phản hồi rỗng.
  return responseBody;
}


// 3. HÀM SAFE REQUEST XỬ LÝ KẾT QUẢ API

async function safeRequest(url, options = {}) {
  try {
    // Gọi request để lấy dữ liệu từ server.
    const data = await request(url, options);

    // Trả về trạng thái thành công cùng dữ liệu nhận được.
    return {
      state: "success",
      data,
      error: null
    };
  } catch (error) {
    // Chỉ xử lý lỗi thuộc lớp ApiError.
    if (error.name === "ApiError") {
      // Trả về trạng thái lỗi cùng mã HTTP và thông báo.
      return {
        state: "error",
        data: null,
        error: {
          status: error.status,
          message: error.message
        }
      };
    }

    // Các lỗi khác như AbortError được ném tiếp.
    throw error;
  }
}


// 4. TEST CASE: messageForStatus()

console.log("===== TEST messageForStatus() =====");

// Kiểm tra lỗi mạng.
console.log(messageForStatus(0));
// Expected: "Không kết nối được tới máy chủ. Hãy kiểm tra mạng và thử lại."

// Kiểm tra lỗi 400.
console.log(messageForStatus(400));
// Expected: "Yêu cầu không hợp lệ. Hãy kiểm tra lại dữ liệu đã gửi."

// Kiểm tra lỗi 401.
console.log(messageForStatus(401));
// Expected: "Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn."

// Kiểm tra lỗi 403.
console.log(messageForStatus(403));
// Expected: "Bạn không có quyền thực hiện thao tác này."

// Kiểm tra lỗi 404.
console.log(messageForStatus(404));
// Expected: "Không tìm thấy dữ liệu yêu cầu."

// Kiểm tra lỗi máy chủ 500.
console.log(messageForStatus(500));
// Expected: "Máy chủ gặp sự cố. Hãy thử lại sau."

// Kiểm tra lỗi máy chủ 599.
console.log(messageForStatus(599));
// Expected: "Máy chủ gặp sự cố. Hãy thử lại sau."

// Kiểm tra mã lỗi khác.
console.log(messageForStatus(418));
// Expected: "Đã xảy ra lỗi (mã 418)."


// 5. TEST CASE: request()

console.log("===== TEST request() =====");

// Kiểm tra lấy danh sách sản phẩm.
request("/products?limit=3")
  .then((data) => {
    console.log(data.products.length);
    // Expected: 3
  })
  .catch((error) => {
    console.log(error.message);
  });

// Kiểm tra truyền params vào request.
request("/products", {
  params: {
    limit: 3,
    skip: 0
  }
})
  .then((data) => {
    console.log(data.products.length, data.skip);
    // Expected: 3 0
  })
  .catch((error) => {
    console.log(error.message);
  });

// Kiểm tra gọi API bằng URL đầy đủ.
request("https://dummyjson.com/products/1")
  .then((data) => {
    console.log(data.id);
    // Expected: 1
  })
  .catch((error) => {
    console.log(error.message);
  });

// Kiểm tra gửi POST với body JSON.
request("/products/add", {
  method: "POST",
  body: {
    title: "Điện thoại thử nghiệm",
    price: 5000000
  }
})
  .then((data) => {
    console.log(data.title);
    // Expected: "Điện thoại thử nghiệm"
  })
  .catch((error) => {
    console.log(error.message);
  });

// Kiểm tra request thành công nhưng response không có body.
request("/products/1", {
  method: "GET"
})
  .then((data) => {
    console.log(data.id);
    // Expected: 1
  })
  .catch((error) => {
    console.log(error.message);
  });

// Kiểm tra sản phẩm không tồn tại.
request("/products/999999")
  .catch((error) => {
    console.log(error.name, error.status, error.message);
    // Expected: ApiError 404 "Không tìm thấy dữ liệu yêu cầu."
  });


// 6. TEST CASE: safeRequest()

console.log("===== TEST safeRequest() =====");

// Kiểm tra request thành công.
safeRequest("/products/1")
  .then((result) => {
    console.log(result.state);
    // Expected: "success"

    console.log(result.data.id);
    // Expected: 1

    console.log(result.error);
    // Expected: null
  });

// Kiểm tra request gặp lỗi 404.
safeRequest("/products/999999")
  .then((result) => {
    console.log(result);
    // Expected:
    // {
    //   state: "error",
    //   data: null,
    //   error: {
    //     status: 404,
    //     message: "Không tìm thấy dữ liệu yêu cầu."
    //   }
    // }
  });
