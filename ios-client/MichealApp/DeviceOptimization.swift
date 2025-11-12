import SwiftUI
import UIKit

// MARK: - Device Detection Helper
enum DeviceType {
    case iPhone
    case iPad
    
    static var current: DeviceType {
        return UIDevice.current.userInterfaceIdiom == .pad ? .iPad : .iPhone
    }
}

// MARK: - Orientation Helper
enum DeviceOrientation {
    case portrait
    case landscape
    
    static var current: DeviceOrientation {
        let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene
        let orientation = windowScene?.interfaceOrientation
        
        switch orientation {
        case .landscapeLeft, .landscapeRight:
            return .landscape
        default:
            return .portrait
        }
    }
}

// MARK: - Safe Area Helper
extension View {
    func safeAreaPadding(_ edges: Edge.Set = .all, _ length: CGFloat? = nil) -> some View {
        self.padding(edges, length)
    }
}

// MARK: - Responsive Layout Modifier
struct ResponsiveLayoutModifier: ViewModifier {
    @Environment(\.horizontalSizeClass) var horizontalSizeClass
    @Environment(\.verticalSizeClass) var verticalSizeClass
    
    var deviceType: DeviceType {
        UIDevice.current.userInterfaceIdiom == .pad ? .iPad : .iPhone
    }
    
    var isLandscape: Bool {
        horizontalSizeClass == .regular && verticalSizeClass == .compact
    }
    
    func body(content: Content) -> some View {
        content
            .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

extension View {
    func responsiveLayout() -> some View {
        modifier(ResponsiveLayoutModifier())
    }
}

// MARK: - Optimized Image Loading
class OptimizedImageLoader: ObservableObject {
    @Published var image: UIImage?
    private var cache = NSCache<NSString, UIImage>()
    
    func loadImage(named name: String) {
        // Check cache first
        if let cachedImage = cache.object(forKey: name as NSString) {
            self.image = cachedImage
            return
        }
        
        // Load from assets
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            guard let image = UIImage(named: name) else { return }
            
            // Cache the image
            self?.cache.setObject(image, forKey: name as NSString)
            
            DispatchQueue.main.async {
                self?.image = image
            }
        }
    }
}

// MARK: - Performance Optimized Background View
struct OptimizedBackgroundView: View {
    @StateObject private var imageLoader = OptimizedImageLoader()
    @Environment(\.horizontalSizeClass) var horizontalSizeClass
    @State private var orientation = DeviceOrientation.current
    
    var backgroundImageName: String {
        DeviceType.current == .iPhone ? "iphone" : "background"
    }
    
    var body: some View {
        GeometryReader { geometry in
            ZStack {
                if let image = imageLoader.image {
                    Image(uiImage: image)
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                        .frame(width: geometry.size.width, height: geometry.size.height)
                        .clipped()
                        .drawingGroup() // Hardware acceleration
                } else {
                    // Loading placeholder
                    Color.black
                }
                
                // Subtle overlay for better readability
                Color.black.opacity(0.2)
            }
            .ignoresSafeArea()
        }
        .onAppear {
            imageLoader.loadImage(named: backgroundImageName)
        }
        .onReceive(NotificationCenter.default.publisher(for: UIDevice.orientationDidChangeNotification)) { _ in
            orientation = DeviceOrientation.current
        }
    }
}

// MARK: - Device-Specific Layout Configuration
struct LayoutConfiguration {
    static func cardPadding(for device: DeviceType, orientation: DeviceOrientation) -> CGFloat {
        switch (device, orientation) {
        case (.iPhone, .portrait):
            return 16
        case (.iPhone, .landscape):
            return 12
        case (.iPad, .portrait):
            return 24
        case (.iPad, .landscape):
            return 32
        }
    }
    
    static func gridColumns(for device: DeviceType, orientation: DeviceOrientation) -> Int {
        switch (device, orientation) {
        case (.iPhone, .portrait):
            return 2
        case (.iPhone, .landscape):
            return 3
        case (.iPad, .portrait):
            return 3
        case (.iPad, .landscape):
            return 4
        }
    }
    
    static func cardHeight(for device: DeviceType, orientation: DeviceOrientation) -> CGFloat {
        switch (device, orientation) {
        case (.iPhone, .portrait):
            return 220
        case (.iPhone, .landscape):
            return 180
        case (.iPad, .portrait):
            return 280
        case (.iPad, .landscape):
            return 240
        }
    }
}

// MARK: - Viewport Configuration
struct ViewportConfiguration {
    static var screenWidth: CGFloat {
        UIScreen.main.bounds.width
    }
    
    static var screenHeight: CGFloat {
        UIScreen.main.bounds.height
    }
    
    static var isLandscape: Bool {
        screenWidth > screenHeight
    }
    
    static var safeAreaInsets: UIEdgeInsets {
        let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene
        return windowScene?.windows.first?.safeAreaInsets ?? .zero
    }
}
