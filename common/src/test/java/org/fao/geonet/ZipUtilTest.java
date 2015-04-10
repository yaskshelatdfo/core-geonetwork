package org.fao.geonet;

import com.google.common.collect.Lists;
import com.google.common.jimfs.Configuration;
import com.google.common.jimfs.Jimfs;
import org.fao.geonet.utils.IO;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;

import java.io.IOException;
import java.net.URISyntaxException;
import java.nio.file.FileSystem;
import java.nio.file.FileVisitResult;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.SimpleFileVisitor;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.List;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

public class ZipUtilTest {

    @Rule
    public TemporaryFolder folder = new TemporaryFolder();

    @Test
    public void testExtract() throws Exception {
        final Path output = folder.getRoot().toPath().resolve("output");
        Files.createDirectories(output);
        Path zipFile = IO.toPath(ZipUtilTest.class.getResource("example.zip").toURI());
        ZipUtil.extract(zipFile, output);

        assertTrue(Files.exists(output.resolve("file3.txt")));
        assertTrue(Files.exists(output.resolve("zipfile/file2.txt")));
        assertTrue(Files.exists(output.resolve("zipfile/file1.txt")));
        assertTrue(Files.exists(output.resolve("zipfile/dir/file4.txt")));
    }

    @Test
    public void testOpenZipFs1() throws Exception {
        final Path zipfile = folder.getRoot().toPath().resolve("zipfile.zip");
        assertCreateZipFile(zipfile);
    }
    @Test
    public void testOpenZipFsVirtualFS() throws Exception {
        final Path srcZipFile = Paths.get(ZipUtilTest.class.getResource("example.zip").toURI());

        Configuration[] configs = new Configuration[]{Configuration.osX(), Configuration.unix(), Configuration.windows()};
        for (Configuration config : configs) {
            final FileSystem fileSystem = Jimfs.newFileSystem(config);
            final Path path = fileSystem.getPath("a", "b c", "mu\\d", "hi", "file.zip");
            Files.createDirectories(path.getParent());
            Files.copy(srcZipFile, path);

            final FileSystem zipFs = ZipUtil.openZipFs(path);
            final List<String> allFiles = Lists.newArrayList();

            Files.walkFileTree(zipFs.getPath("/"), new SimpleFileVisitor<Path>(){
                @Override
                public FileVisitResult preVisitDirectory(Path dir, BasicFileAttributes attrs) throws IOException {
                    allFiles.add(dir.toString());
                    return super.preVisitDirectory(dir, attrs);
                }

                @Override
                public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException {
                    allFiles.add(file.toString());
                    return super.visitFile(file, attrs);
                }
            });

            assertEquals(7, allFiles.size());
            assertTrue(allFiles.toString(), allFiles.contains("/"));
            assertTrue(allFiles.toString(), allFiles.contains("/zipfile/"));
            assertTrue(allFiles.toString(), allFiles.contains("/zipfile/file1.txt"));
            assertTrue(allFiles.toString(), allFiles.contains("/zipfile/file2.txt"));
            assertTrue(allFiles.toString(), allFiles.contains("/zipfile/dir/"));
            assertTrue(allFiles.toString(), allFiles.contains("/zipfile/dir/file4.txt"));
            assertTrue(allFiles.toString(), allFiles.contains("/file3.txt"));
        }
    }
    @Test
    public void testOpenMefFs() throws Exception {
        final Path zipfile = folder.getRoot().toPath().resolve("zipfile.mef");
        Files.createFile(zipfile);
        assertCreateZipFile(zipfile);
    }

    protected void assertCreateZipFile(Path zipfile) throws IOException, URISyntaxException {
        final Path input = folder.getRoot().toPath().resolve("input");
        final Path output = folder.getRoot().toPath().resolve("output");

        final Path file1 = input.resolve("file1.xml");
        final Path file2 = input.resolve("dir1/file2.xml");
        final Path file3 = input.resolve("dir1/file3.xml");
        final Path file4 = input.resolve("dir1/dir2/file4.xml");

        IO.touch(file1);
        IO.touch(file2);
        IO.touch(file3);
        IO.touch(file4);

        try (FileSystem zipFs = ZipUtil.createZipFs(zipfile)) {
            IO.copyDirectoryOrFile(file1, zipFs.getPath(file1.getFileName().toString()), false);
            final Path dir1 = file2.getParent().getFileName();
            IO.copyDirectoryOrFile(file2.getParent(), zipFs.getPath(dir1.toString()), false);
        }

        assertTrue(Files.exists(zipfile));

        try (FileSystem zipFs = ZipUtil.openZipFs(zipfile)) {
            assertTrue(Files.exists(zipFs.getPath(file1.getFileName().toString())));
            assertTrue(Files.exists(zipFs.getPath(input.relativize(file2).toString())));
            assertTrue(Files.exists(zipFs.getPath(input.relativize(file3).toString())));
            assertTrue(Files.exists(zipFs.getPath(input.relativize(file4).toString())));
        }

        ZipUtil.extract(zipfile, output);

        assertTrue(Files.exists(output.resolve(file1.getFileName().toString())));
        assertTrue(Files.exists(output.resolve(input.relativize(file2).toString())));
        assertTrue(Files.exists(output.resolve(input.relativize(file3).toString())));
        assertTrue(Files.exists(output.resolve(input.relativize(file4).toString())));
    }
}