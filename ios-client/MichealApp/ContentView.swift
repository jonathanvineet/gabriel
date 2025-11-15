import SwiftUI
import UIKit
import CoreGraphics

// MARK: - iOS Version Compatibility Helpers
extension Font.Weight {
    static var compatibleBlack: Font.Weight {
        if #available(iOS 16.0, *) {
            return .black
        } else {
            return .heavy
        }
    }
}

// MARK: - Main App Structure (Original)
@available(iOS 15.0, *)
struct ContentView: View {
    @State private var showDashboard = true
    @Environment(\.horizontalSizeClass) var horizontalSizeClass
    
    var body: some View {
        GeometryReader { geometry in
            ZStack {
                DeviceBackgroundView()
                    .ignoresSafeArea()
                
                if showDashboard {
                    DashboardView(showDashboard: $showDashboard)
                } else {
                    FileManagerView(showDashboard: $showDashboard)
                }
            }
        }
    }
}

// MARK: - Device Background View (Original)
struct DeviceBackgroundView: View {
    @Environment(\.horizontalSizeClass) var horizontalSizeClass
    
    var backgroundImageName: String {
        let idiom = UIDevice.current.userInterfaceIdiom
        switch idiom {
        case .phone: return "iphone"
        case .pad: return "background"
        default: return "background"
        }
    }
    
    var body: some View {
        GeometryReader { geometry in
            if let image = UIImage(named: backgroundImageName) {
                Image(uiImage: image)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .frame(width: geometry.size.width, height: geometry.size.height)
                    .clipped()
                    .ignoresSafeArea()
            } else {
                LinearGradient(
                    colors: [Color(red: 0.05, green: 0.05, blue: 0.1), Color.black],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                .ignoresSafeArea()
            }
            Color.black.opacity(0.3).ignoresSafeArea()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Dashboard View (Original, with new integration)
@available(iOS 15.0, *)
struct DashboardView: View {
    @Binding var showDashboard: Bool
    @State private var currentTime = Date()
    @State private var serverReachable = false
    @State private var checkingConnection = true
    
    @State private var storageUsed: Double = 0.0
    @State private var storageTotal: Double = 100.0
    @State private var recentFiles: [FileItem] = []
    @State private var todos: [String] = []
    @State private var newTodo: String = ""
    @State private var showTodoInput: Bool = false
    @State private var showWhiteboardCollections: Bool = false
    
    @Environment(\.horizontalSizeClass) var horizontalSizeClass
    
    private var fileManagerClient: FileManagerClient { FileManagerClient.shared }
    private let timer = Timer.publish(every: 1, on: .main, in: .common).autoconnect()
    
    var body: some View {
        GeometryReader { geometry in
            let greetingFont = Swift.min(56, Swift.max(28, geometry.size.width * 0.085))
            ScrollView {
                VStack(spacing: 16) {
                    if checkingConnection {
                        HStack {
                            ProgressView()
                            Text("Checking server connection...").font(.caption)
                        }.padding().background(Color.blue.opacity(0.1)).cornerRadius(8)
                    } else if !serverReachable {
                        VStack(spacing: 8) {
                            Text("⚠️ Cannot reach server").font(.headline)
                            Text("Make sure you're on the same WiFi network").font(.caption)
                            Text("Server: \(fileManagerClient.baseURL)").font(.caption2).foregroundColor(.secondary)
                            Button("Retry Connection") { checkServerConnection() }
                            .buttonStyle(.borderedProminent).controlSize(.small)
                        }.padding().background(Color.orange.opacity(0.1)).cornerRadius(8)
                    }

                    HStack {
                        VStack(alignment: .leading, spacing: 6) {
                            HStack(spacing: 6) {
                                Text("Hello,").font(.system(size: greetingFont, weight: .bold)).foregroundColor(.white).lineLimit(1).minimumScaleFactor(0.5)
                                Text("Batman").font(.system(size: greetingFont, weight: .bold))
                                    .foregroundStyle(LinearGradient(colors: [Color.yellow, Color.orange], startPoint: .leading, endPoint: .trailing))
                                    .lineLimit(1).minimumScaleFactor(0.5)
                            }
                            Text(currentTime, style: .date).font(.system(size: 16)).foregroundColor(.gray)
                        }
                        Spacer()
                        VStack(alignment: .trailing, spacing: 2) {
                            Text(currentTime, style: .time).font(.system(size: 40, weight: Font.Weight.compatibleBlack)).foregroundColor(.white)
                            Text(currentTime.formatted(.dateTime.hour().minute()).components(separatedBy: " ").last ?? "").font(.system(size: 12, weight: .medium)).foregroundColor(.gray).textCase(.uppercase)
                        }
                    }.padding(.horizontal, 24).padding(.top, 16)

                    if horizontalSizeClass == .compact {
                        VStack(spacing: 14) {
                            CameraFeedCard().frame(height: Swift.max(300, geometry.size.height * 0.40)).padding(.horizontal, 16)
                            HStack(spacing: 14) {
                                ScribbleCard(showWhiteboardCollections: $showWhiteboardCollections)
                                StorageCard(storageUsed: storageUsed, storageTotal: storageTotal, recentFiles: recentFiles)
                            }.frame(height: 180).padding(.horizontal, 16)
                            TodoCard(todos: $todos, newTodo: $newTodo, showTodoInput: $showTodoInput).frame(height: 250).padding(.horizontal, 16)
                            Button(action: { showDashboard = false }) {
                                HStack {
                                    Image(systemName: "internaldrive.fill").font(.system(size: 24, weight: .bold)).foregroundColor(.black).frame(width: 56, height: 56)
                                        .background(LinearGradient(colors: [Color.yellow, Color.orange], startPoint: .topLeading, endPoint: .bottomTrailing))
                                        .clipShape(RoundedRectangle(cornerRadius: 16))
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text("Cloud Storage").font(.system(size: 22, weight: Font.Weight.compatibleBlack)).foregroundColor(.white)
                                        Text("Tap to expand and manage files").font(.system(size: 12)).foregroundColor(.white.opacity(0.4))
                                    }
                                    Spacer()
                                    Image(systemName: "eye.fill").font(.system(size: 24)).foregroundColor(.yellow)
                                }.padding(20)
                                .background(RoundedRectangle(cornerRadius: 24).fill(.black.opacity(0.5)).overlay(RoundedRectangle(cornerRadius: 24).stroke(Color.white.opacity(0.1), lineWidth: 1)))
                            }.padding(.horizontal, 16).padding(.bottom, 30)
                        }
                    } else {
                        VStack(spacing: 16) {
                            HStack(alignment: .top, spacing: 16) {
                                CameraFeedCard().frame(height: Swift.max(400, geometry.size.height * 0.50)).frame(maxWidth: .infinity)
                                VStack(spacing: 16) {
                                    ScribbleCard(showWhiteboardCollections: $showWhiteboardCollections)
                                    StorageCard(storageUsed: storageUsed, storageTotal: storageTotal, recentFiles: recentFiles)
                                }.frame(maxWidth: geometry.size.width * 0.33)
                            }.padding(.horizontal, 24)
                            TodoCard(todos: $todos, newTodo: $newTodo, showTodoInput: $showTodoInput).frame(height: 300).padding(.horizontal, 24)
                            HStack {
                                Button(action: { showDashboard = false }) {
                                    HStack {
                                        Image(systemName: "internaldrive.fill").font(.system(size: 24, weight: .bold)).foregroundColor(.black).frame(width: 56, height: 56)
                                            .background(LinearGradient(colors: [Color.yellow, Color.orange], startPoint: .topLeading, endPoint: .bottomTrailing))
                                            .clipShape(RoundedRectangle(cornerRadius: 16))
                                        VStack(alignment: .leading, spacing: 4) {
                                            Text("Cloud Storage").font(.system(size: 24, weight: Font.Weight.compatibleBlack)).foregroundColor(.white)
                                            Text("Tap to expand and manage files").font(.system(size: 12)).foregroundColor(.white.opacity(0.4))
                                        }
                                        Spacer()
                                        Image(systemName: "eye.fill").font(.system(size: 28)).foregroundColor(.yellow)
                                    }.padding(24)
                                    .background(RoundedRectangle(cornerRadius: 24).fill(.black.opacity(0.5)).overlay(RoundedRectangle(cornerRadius: 24).stroke(Color.white.opacity(0.1), lineWidth: 1)))
                                }
                            }.padding(.horizontal, 24).padding(.bottom, 30)
                        }
                    }
                }
                .onReceive(timer) { _ in currentTime = Date() }
                .onAppear {
                    checkServerConnection()
                    loadRecentFiles()
                }
            }
            .fullScreenCover(isPresented: $showWhiteboardCollections) {
                WhiteboardListView()
            }
        }
    }
    
    func checkServerConnection() {
        checkingConnection = true
        serverReachable = false
        guard let url = URL(string: fileManagerClient.baseURL) else {
            checkingConnection = false
            return
        }
        var request = URLRequest(url: url)
        request.timeoutInterval = 5
        URLSession.shared.dataTask(with: request) { _, response, error in
            DispatchQueue.main.async {
                checkingConnection = false
                serverReachable = (error == nil)
            }
        }.resume()
    }

    func loadRecentFiles() {
        fileManagerClient.listFiles { result in
            DispatchQueue.main.async {
                switch result {
                case .success(let items):
                    self.recentFiles = items
                case .failure:
                    self.recentFiles = []
                }
            }
        }
    }
}

// MARK: - Dashboard Cards (Original)
@available(iOS 15.0, *)
struct ScribbleCard: View {
    @Binding var showWhiteboardCollections: Bool
    var body: some View {
        Button(action: { showWhiteboardCollections = true }) {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Text("SCRIBBLE").font(.system(size: 11, weight: .bold)).foregroundColor(.white.opacity(0.6)).tracking(1.5)
                    Spacer()
                    Image(systemName: "pencil.tip.crop.circle").font(.system(size: 32)).foregroundColor(.yellow.opacity(0.8))
                }
                Spacer()
                Image(systemName: "scribble.variable").font(.system(size: 40, weight: .light)).foregroundColor(.white.opacity(0.3))
                Spacer()
                Text("Infinite Board").font(.system(size: 14, weight: .medium)).foregroundColor(.white.opacity(0.8))
                Text("Tap to draw").font(.system(size: 11)).foregroundColor(.white.opacity(0.5))
            }
            .frame(maxWidth: .infinity, alignment: .leading).padding(20)
            .background(RoundedRectangle(cornerRadius: 24).fill(LinearGradient(colors: [Color.yellow.opacity(0.15), Color.orange.opacity(0.1)], startPoint: .topLeading, endPoint: .bottomTrailing)).overlay(RoundedRectangle(cornerRadius: 24).stroke(Color.white.opacity(0.1), lineWidth: 1)))
        }.buttonStyle(PlainButtonStyle())
    }
}

// Minimal implementations for dashboard subviews (keeps UI working).
@available(iOS 15.0, *)
struct CameraFeedCard: View {
    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 16).fill(Color.black.opacity(0.45))
            VStack { Image(systemName: "video.fill").font(.system(size: 48)).foregroundColor(.yellow); Text("Live Camera").foregroundColor(.white) }
        }
    }
}

@available(iOS 15.0, *)
struct StorageCard: View {
    var storageUsed: Double
    var storageTotal: Double
    var recentFiles: [FileItem]
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack { Image(systemName: "externaldrive.fill").foregroundColor(.yellow); Text("Storage").foregroundColor(.white).font(.headline); Spacer() }
            ProgressView(value: storageTotal > 0 ? storageUsed / storageTotal : 0).tint(.yellow)
            Text(String(format: "%.0f / %.0f MB", storageUsed, storageTotal)).font(.caption).foregroundColor(.gray)
            if !recentFiles.isEmpty { Text("Recent: \(recentFiles.first?.name ?? "—")").font(.caption2).foregroundColor(.white.opacity(0.8)) }
        }
        .padding(16)
        .background(RoundedRectangle(cornerRadius: 16).fill(Color.black.opacity(0.35)))
    }
}

@available(iOS 15.0, *)
struct TodoCard: View {
    @Binding var todos: [String]
    @Binding var newTodo: String
    @Binding var showTodoInput: Bool
    var body: some View {
        VStack(alignment: .leading) {
            HStack { Text("Todo").font(.headline).foregroundColor(.white); Spacer(); Button(action: { showTodoInput.toggle() }) { Image(systemName: "plus") } }
            if showTodoInput {
                HStack { TextField("New todo", text: $newTodo).textFieldStyle(RoundedBorderTextFieldStyle()); Button("Add") { if !newTodo.isEmpty { todos.append(newTodo); newTodo = ""; showTodoInput = false } } }
            }
            ForEach(Array(todos.enumerated()), id: \.offset) { pair in
                HStack { Text(pair.element).foregroundColor(.white); Spacer(); Button(action: { todos.remove(at: pair.offset) }) { Image(systemName: "trash") } }
            }
        }
        .padding(16)
        .background(RoundedRectangle(cornerRadius: 16).fill(Color.black.opacity(0.35)))
    }
}

// Lightweight FileManager view to avoid missing symbol errors. The app has a richer implementation elsewhere; this is a safe fallback.
@available(iOS 15.0, *)
struct FileManagerView: View {
    @Binding var showDashboard: Bool
    @State private var items: [FileItem] = []
    var body: some View {
        NavigationView {
            List(items) { item in
                HStack { Image(systemName: item.isDirectory ? "folder.fill" : "doc.fill"); Text(item.name) }
            }
            .navigationTitle("Files")
            .toolbar { ToolbarItem(placement: .navigationBarLeading) { Button("Back") { showDashboard = true } } }
        }
        .onAppear { FileManagerClient.shared.listFiles { res in if case .success(let i) = res { DispatchQueue.main.async { items = i } } } }
    }
}

@available(iOS 15.0, *)
struct FileGridItem: View {
    let item: FileItem
    let onTap: () -> Void
    var body: some View { Button(action: onTap) { VStack { Image(systemName: item.isDirectory ? "folder.fill" : "doc.fill").font(.largeTitle); Text(item.name).font(.caption) } } }
}

@available(iOS 15.0, *)
struct ImageViewer: View {
    let item: FileItem
    @Binding var isPresented: Bool
    let onRefresh: () -> Void
    var body: some View { VStack { Text("Preview: \(item.name)"); Button("Close") { isPresented = false } } }
}

class MJPEGStreamView: NSObject, ObservableObject {
    @Published var currentFrame: UIImage? = nil
    @Published var isStreaming: Bool = false
}

struct DocumentPicker: UIViewControllerRepresentable {
    var onPick: ([URL]) -> Void
    func makeCoordinator() -> Coordinator { Coordinator(self) }
    func makeUIViewController(context: Context) -> UIDocumentPickerViewController {
        let vc = UIDocumentPickerViewController(forOpeningContentTypes: [.item], asCopy: true)
        vc.delegate = context.coordinator
        return vc
    }
    func updateUIViewController(_ uiViewController: UIDocumentPickerViewController, context: Context) {}
    class Coordinator: NSObject, UIDocumentPickerDelegate { let parent: DocumentPicker; init(_ p: DocumentPicker) { parent = p }; func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) { parent.onPick(urls) } }
}


// MARK: - NEW, CORRECTED WHITEBOARD IMPLEMENTATION
// MARK: Core Data Models
struct DrawingPath: Codable, Identifiable, Equatable {
    var id = UUID()
    var points: [CGPoint] = []
    var color: Color = .white
    var lineWidth: CGFloat = 3.0
    enum CodingKeys: String, CodingKey { case id, points, color, lineWidth }
    init(points: [CGPoint] = [], color: Color = .white, lineWidth: CGFloat = 3.0) { self.points = points; self.color = color; self.lineWidth = lineWidth }
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        points = try container.decode([CGPoint].self, forKey: .points)
        lineWidth = try container.decode(CGFloat.self, forKey: .lineWidth)
        let colorComponents = try container.decode([CGFloat].self, forKey: .color)
        if colorComponents.count == 4 { color = Color(.sRGB, red: colorComponents[0], green: colorComponents[1], blue: colorComponents[2], opacity: colorComponents[3]) } else { color = .white }
    }
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id); try container.encode(points, forKey: .points); try container.encode(lineWidth, forKey: .lineWidth)
        let uiColor = UIColor(color); var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
        uiColor.getRed(&r, green: &g, blue: &b, alpha: &a); try container.encode([r, g, b, a], forKey: .color)
    }
}

struct DrawingDocument: Codable, Identifiable, Equatable {
    var id = UUID(); var name: String; var paths: [DrawingPath] = []; var modifiedAt: Date = Date()
}

// MARK: Drawing Data Store
@MainActor
class DrawingStore: ObservableObject {
    @Published var documents: [DrawingDocument] = []
    private var documentsURL: URL { FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0] }
    init() { loadDocuments() }
    func loadDocuments() {
        let fileManager = FileManager.default
        guard let urls = try? fileManager.contentsOfDirectory(at: documentsURL, includingPropertiesForKeys: nil) else { return }
        self.documents = urls.filter { $0.pathExtension == "json" }.compactMap { url in try? JSONDecoder().decode(DrawingDocument.self, from: Data(contentsOf: url)) }.sorted(by: { $0.modifiedAt > $1.modifiedAt })
    }
    func save(document: DrawingDocument) {
        var docToSave = document; docToSave.modifiedAt = Date()
        let url = documentsURL.appendingPathComponent("\(docToSave.id).json")
        do {
            let data = try JSONEncoder().encode(docToSave)
            try data.write(to: url)
            if let index = documents.firstIndex(where: { $0.id == docToSave.id }) { documents[index] = docToSave } else { documents.insert(docToSave, at: 0) }
            documents.sort(by: { $0.modifiedAt > $1.modifiedAt })
        } catch { print("Failed to save document: \(error)") }
    }
    func createDocument(name: String) -> DrawingDocument { let newDoc = DrawingDocument(name: name); save(document: newDoc); return newDoc }
    func delete(document: DrawingDocument) { let url = documentsURL.appendingPathComponent("\(document.id).json"); try? FileManager.default.removeItem(at: url); documents.removeAll { $0.id == document.id } }
}

// MARK: Main Whiteboard UI
@available(iOS 15.0, *)
struct WhiteboardListView: View {
    @StateObject private var store = DrawingStore()
    @State private var showNewDocSheet = false
    @State private var newDocName = ""
    @State private var selectedDocID: UUID?
    @Environment(\.presentationMode) var presentationMode

    var body: some View {
        NavigationView {
            ZStack {
                Color(UIColor.systemGroupedBackground).ignoresSafeArea()
                if store.documents.isEmpty { emptyStateView } else { drawingsGridView }
            }
            .navigationTitle("Whiteboards")
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) { Button("Done") { presentationMode.wrappedValue.dismiss() } }
                ToolbarItem(placement: .navigationBarTrailing) { Button { showNewDocSheet = true } label: { Image(systemName: "plus") } }
            }
            .sheet(isPresented: $showNewDocSheet) { createNewDocumentSheet }
            .background(
                NavigationLink(
                    destination: Group {
                        if let id = selectedDocID, let index = store.documents.firstIndex(where: { $0.id == id }) {
                            DrawingEditorView(document: $store.documents[index])
                        }
                    },
                    isActive: Binding(get: { selectedDocID != nil }, set: { isActive in if !isActive { selectedDocID = nil } }),
                    label: { EmptyView() }
                )
            )
        }
        .accentColor(.yellow).environmentObject(store).onAppear { store.loadDocuments() }
    }
    private var drawingsGridView: some View {
        ScrollView {
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 160), spacing: 16)], spacing: 16) {
                ForEach(store.documents) { doc in
                    Button(action: { selectedDocID = doc.id }) {
                        VStack(alignment: .leading, spacing: 8) {
                            DrawingPreview(document: doc)
                                .aspectRatio(4/3, contentMode: .fit)
                                .background(Color.secondary.opacity(0.1))
                                .cornerRadius(12)
                                .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.secondary.opacity(0.2)))

                            Text(doc.name).font(.headline).foregroundColor(.primary).lineLimit(1)
                            Text(doc.modifiedAt, style: .relative).font(.caption2).foregroundColor(.secondary)
                        }
                    }
                    .contextMenu {
                        Button(role: .destructive, action: { store.delete(document: doc) }) {
                            Label("Delete", systemImage: "trash")
                        }
                    }
                }
            }
            .padding()
        }
    }

    private var emptyStateView: some View {
        VStack(spacing: 20) {
            Image(systemName: "scribble.variable").font(.system(size: 60)).foregroundColor(.gray)
            Text("No Whiteboards").font(.title.bold())
            Text("Tap the + button to create a new one.").font(.subheadline).foregroundColor(.gray)
        }
    }

    private var createNewDocumentSheet: some View {
        NavigationView {
            Form {
                Section(header: Text("Whiteboard Name")) {
                    TextField("My Awesome Drawing", text: $newDocName)
                }
                Button("Create") {
                    let newDoc = store.createDocument(name: newDocName.isEmpty ? "Untitled" : newDocName)
                    newDocName = ""
                    showNewDocSheet = false
                    selectedDocID = newDoc.id
                }
                .disabled(newDocName.isEmpty)
            }
            .navigationTitle("New Whiteboard")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { showNewDocSheet = false; newDocName = "" }
                }
            }
        }
    }
}

// MARK: Drawing Preview
@available(iOS 15.0, *)
struct DrawingPreview: View {
    let document: DrawingDocument

    var body: some View {
        Canvas { context, size in
            let allPoints = document.paths.flatMap { $0.points }
            guard let boundingBox = allPoints.boundingBox() else { return }

            let drawingSize = boundingBox.size
            guard drawingSize.width > 0, drawingSize.height > 0 else { return }
            
            let scale = Swift.min(size.width / drawingSize.width, size.height / drawingSize.height)
            let offset = CGPoint(x: (size.width - drawingSize.width * scale) / 2, y: (size.height - drawingSize.height * scale) / 2)

            context.translateBy(x: offset.x, y: offset.y)
            context.scaleBy(x: scale, y: scale)
            context.translateBy(x: -boundingBox.origin.x, y: -boundingBox.origin.y)

            for path in document.paths {
                guard !path.points.isEmpty else { continue }
                var p = Path()
                p.addLines(path.points)
                context.stroke(p, with: .color(path.color), style: StrokeStyle(lineWidth: path.lineWidth / scale, lineCap: .round, lineJoin: .round))
            }
        }
        .clipped()
    }
}

// MARK: Drawing Editor
@available(iOS 15.0, *)
struct DrawingEditorView: View {
    @Binding var document: DrawingDocument
    @Environment(\.presentationMode) var presentationMode
    @EnvironmentObject private var store: DrawingStore
    @State private var currentPath = DrawingPath()
    @State private var selectedColor: Color = .white
    @State private var selectedLineWidth: CGFloat = 3.0
    @State private var scale: CGFloat = 1.0
    @State private var lastScale: CGFloat = 1.0
    @State private var offset: CGSize = .zero
    @State private var lastOffset: CGSize = .zero
    private let availableColors: [Color] = [.white, .red, .green, .blue, .yellow, .orange, .purple]

    var body: some View {
        ZStack {
            Color(red: 0.1, green: 0.1, blue: 0.12).ignoresSafeArea()
            DrawingCanvas(paths: $document.paths, currentPath: $currentPath, scale: $scale, lastScale: $lastScale, offset: $offset, lastOffset: $lastOffset)
                .ignoresSafeArea()
            VStack { editorToolbar; Spacer() }
        }
        .navigationTitle(document.name).navigationBarTitleDisplayMode(.inline).navigationBarBackButtonHidden(true)
        .toolbar {
            ToolbarItem(placement: .navigationBarLeading) { Button(action: { presentationMode.wrappedValue.dismiss() }) { HStack { Image(systemName: "chevron.left"); Text("Back") } } }
            ToolbarItemGroup(placement: .navigationBarTrailing) {
                Button(action: resetView) { Image(systemName: "arrow.counterclockwise") }
                Button(action: undo) { Image(systemName: "arrow.uturn.backward") }.disabled(document.paths.isEmpty)
            }
        }
        .onDisappear { store.save(document: document) }
        .onChange(of: selectedColor) { newColor in currentPath.color = newColor }
        .onChange(of: selectedLineWidth) { newWidth in currentPath.lineWidth = newWidth }
    }
    private var editorToolbar: some View {
        VStack(spacing: 12) {
            HStack {
                ForEach(availableColors, id: \.self) { color in
                    Button(action: { selectedColor = color }) {
                        Circle().fill(color).frame(width: 30, height: 30)
                            .overlay(Circle().stroke(Color.white, lineWidth: selectedColor == color ? 2 : 0))
                    }
                }
            }
            HStack {
                Image(systemName: "circle.fill").font(.system(size: 8))
                Slider(value: $selectedLineWidth, in: 1...20)
                Image(systemName: "circle.fill").font(.system(size: 20))
            }
            .foregroundColor(.white).padding(.horizontal)
        }
        .padding().background(Color.black.opacity(0.5)).cornerRadius(20).padding(.horizontal)
        .onChange(of: selectedColor) { newColor in currentPath.color = newColor }
        .onChange(of: selectedLineWidth) { newWidth in currentPath.lineWidth = newWidth }
    }
    private func undo() { if !document.paths.isEmpty { document.paths.removeLast() } }
    private func resetView() { withAnimation { scale = 1.0; lastScale = 1.0; offset = .zero; lastOffset = .zero } }
}

// MARK: UIKit Drawing Canvas
@available(iOS 15.0, *)
struct DrawingCanvas: UIViewRepresentable {
    @Binding var paths: [DrawingPath]; @Binding var currentPath: DrawingPath
    @Binding var scale: CGFloat; @Binding var lastScale: CGFloat; @Binding var offset: CGSize; @Binding var lastOffset: CGSize
    func makeUIView(context: Context) -> CanvasView {
        let view = CanvasView(); view.delegate = context.coordinator; view.backgroundColor = .clear; view.isMultipleTouchEnabled = true
        let pinch = UIPinchGestureRecognizer(target: context.coordinator, action: #selector(Coordinator.handlePinch(_:))); pinch.delegate = context.coordinator; view.addGestureRecognizer(pinch)
        let pan = UIPanGestureRecognizer(target: context.coordinator, action: #selector(Coordinator.handlePan(_:))); pan.minimumNumberOfTouches = 2; pan.delegate = context.coordinator; view.addGestureRecognizer(pan)
        return view
    }
    func updateUIView(_ uiView: CanvasView, context: Context) { uiView.paths = paths; uiView.currentPath = currentPath; uiView.scale = scale; uiView.offset = offset }
    func makeCoordinator() -> Coordinator { Coordinator(self) }
    class Coordinator: NSObject, CanvasViewDelegate, UIGestureRecognizerDelegate {
        var parent: DrawingCanvas
        init(_ parent: DrawingCanvas) { self.parent = parent }
        func didBeginPath(at point: CGPoint) { parent.currentPath.points = [point] }
        func didAppendToPath(at point: CGPoint) { parent.currentPath.points.append(point) }
        func didEndPath() { if !parent.currentPath.points.isEmpty { parent.paths.append(parent.currentPath); parent.currentPath = DrawingPath(color: parent.currentPath.color, lineWidth: parent.currentPath.lineWidth) } }
        @objc func handlePinch(_ gesture: UIPinchGestureRecognizer) {
            switch gesture.state {
            case .began: parent.lastScale = parent.scale
            case .changed: let newScale = parent.lastScale * gesture.scale; parent.scale = Swift.max(0.2, Swift.min(newScale, 5.0))
            case .ended, .cancelled: parent.lastScale = 1.0
            default: break
            }
        }
        @objc func handlePan(_ gesture: UIPanGestureRecognizer) {
            guard gesture.numberOfTouches == 2 else { return }
            let translation = gesture.translation(in: gesture.view)
            switch gesture.state {
            case .began: parent.lastOffset = parent.offset
            case .changed: parent.offset = CGSize(width: parent.lastOffset.width + translation.x, height: parent.lastOffset.height + translation.y)
            default: break
            }
        }
        func gestureRecognizer(_ gestureRecognizer: UIGestureRecognizer, shouldRecognizeSimultaneouslyWith other: UIGestureRecognizer) -> Bool { return true }
    }
}

protocol CanvasViewDelegate: AnyObject { func didBeginPath(at point: CGPoint); func didAppendToPath(at point: CGPoint); func didEndPath() }

class CanvasView: UIView {
    weak var delegate: CanvasViewDelegate?; var paths: [DrawingPath] = [] { didSet { setNeedsDisplay() } }; var currentPath: DrawingPath? { didSet { setNeedsDisplay() } }
    var scale: CGFloat = 1.0 { didSet { setNeedsDisplay() } }; var offset: CGSize = .zero { didSet { setNeedsDisplay() } }; private var isDrawing = false
    override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent?) {
        guard event?.allTouches?.count == 1, let touch = touches.first else { isDrawing = false; return }
        isDrawing = true; let point = touch.location(in: self).transformed(by: transformToCanvas()); delegate?.didBeginPath(at: point)
    }
    override func touchesMoved(_ touches: Set<UITouch>, with event: UIEvent?) {
        guard isDrawing, let touch = touches.first else { return }
        let point = touch.location(in: self).transformed(by: transformToCanvas()); delegate?.didAppendToPath(at: point)
    }
    override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent?) { guard isDrawing else { return }; isDrawing = false; delegate?.didEndPath() }
    override func touchesCancelled(_ touches: Set<UITouch>, with event: UIEvent?) { guard isDrawing else { return }; isDrawing = false; delegate?.didEndPath() }
    override func draw(_ rect: CGRect) {
        guard let context = UIGraphicsGetCurrentContext() else { return }
        context.saveGState(); context.translateBy(x: offset.width, y: offset.height); context.scaleBy(x: scale, y: scale)
        context.setLineCap(.round); context.setLineJoin(.round)
        for path in paths { draw(path: path, in: context) }
        if let currentPath = currentPath, isDrawing { draw(path: currentPath, in: context) }
        context.restoreGState()
    }
    private func draw(path: DrawingPath, in context: CGContext) {
        guard !path.points.isEmpty else { return }
        context.setLineWidth(path.lineWidth / scale); context.setStrokeColor(UIColor(path.color).cgColor)
        let cgPath = CGMutablePath(); cgPath.addLines(between: path.points); context.addPath(cgPath); context.strokePath()
    }
    private func transformToCanvas() -> CGAffineTransform { return CGAffineTransform.identity.translatedBy(x: -offset.width, y: -offset.height).scaledBy(x: 1 / scale, y: 1 / scale) }
}

// MARK: - Utility Extensions
extension Collection where Element == CGPoint {
    func boundingBox() -> CGRect? {
        guard let firstPoint = self.first else { return nil }
        var minX = firstPoint.x, minY = firstPoint.y, maxX = firstPoint.x, maxY = firstPoint.y
        self.forEach { point in minX = Swift.min(minX, point.x); minY = Swift.min(minY, point.y); maxX = Swift.max(maxX, point.x); maxY = Swift.max(maxY, point.y) }
        return CGRect(x: minX, y: minY, width: maxX - minX, height: maxY - minY)
    }
}

extension CGPoint {
    func transformed(by transform: CGAffineTransform) -> CGPoint { return self.applying(transform) }
}

// CGPoint Codable conformance removed — CGPoint is already Codable on modern SDKs.

@available(iOS 15.0, *)
struct ContentView_Previews: PreviewProvider {
    static var previews: some View { ContentView() }
}