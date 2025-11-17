import Foundation
import UIKit

final class ThumbnailPrefetcher {
    static let shared = ThumbnailPrefetcher()

    private let cache = NSCache<NSString, UIImage>()
    private let semaphore = DispatchSemaphore(value: 4) // limit concurrent fetches
    private let queue = DispatchQueue(label: "thumbnail.prefetcher", attributes: .concurrent)

    private init() {}

    func image(forPath path: String) -> UIImage? {
        return cache.object(forKey: path as NSString)
    }

    func prefetch(path: String, completion: @escaping (UIImage?) -> Void) {
        if let img = image(forPath: path) {
            completion(img); return
        }

        queue.async {
            // throttle concurrent downloads
            self.semaphore.wait()
            defer { self.semaphore.signal() }

            guard let base = URL(string: FileManagerClient.shared.baseURL) else { DispatchQueue.main.async { completion(nil) }; return }
            var components = URLComponents()
            components.scheme = base.scheme
            components.host = base.host
            components.port = base.port
            components.path = (base.path as NSString).appendingPathComponent("api/thumbnail")
            components.queryItems = [URLQueryItem(name: "path", value: path)]
            guard let url = components.url else { DispatchQueue.main.async { completion(nil) }; return }

            var req = URLRequest(url: url)
            req.cachePolicy = .reloadIgnoringLocalCacheData

            let sem = DispatchSemaphore(value: 0)
            var resultImage: UIImage? = nil
            let task = URLSession.shared.dataTask(with: req) { data, resp, err in
                defer { sem.signal() }
                if let data = data, let img = UIImage(data: data) {
                    resultImage = img
                    self.cache.setObject(img, forKey: path as NSString)
                }
            }
            task.resume()
            // wait up to 5s for thumbnail
            _ = sem.wait(timeout: .now() + 5)
            DispatchQueue.main.async { completion(resultImage) }
        }
    }
}
