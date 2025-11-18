# Troubleshooting Guide

Common issues and solutions for difflicious.

## Table of Contents

- [Installation Issues](#installation-issues)
- [Runtime Issues](#runtime-issues)
- [Docker Issues](#docker-issues)
- [Performance Issues](#performance-issues)
- [Git Issues](#git-issues)

## Installation Issues

### Import Errors

**Problem**: `ModuleNotFoundError` or import errors when running the application.

**Solution**:
```bash
# Ensure all dependencies are installed
pip install --upgrade difflicious

# Or with uv
uv sync
```

### Python Version

**Problem**: Application fails to start with Python version errors.

**Solution**: difflicious requires Python 3.9 or higher:

```bash
# Check Python version
python --version

# Upgrade Python if needed
# (Use your system's package manager)
```

## Runtime Issues

### Port Already in Use

**Problem**: Error "Address already in use" when starting.

**Solution**:
```bash
# Check what's using the port
lsof -i :5000

# Use a different port
difflicious --port 8080

# Or kill the process using the port
kill -9 $(lsof -t -i:5000)
```

### Font Not Loading

**Problem**: Fonts don't appear correctly in the UI.

**Solution**:
```bash
# Check font selection
difflicious --list-fonts

# Try different font
export DIFFLICIOUS_FONT=source-code-pro
difflicious

# Disable Google Fonts if behind firewall
export DIFFLICIOUS_DISABLE_GOOGLE_FONTS=true
difflicious
```

### Git Repository Not Found

**Problem**: "Not a git repository" errors.

**Solution**:
```bash
# Ensure you're in a git repository
cd /path/to/git/repo
git status

# Or specify repository path
cd /path/to/repo
difflicious

# Or set environment variable
export DIFFLICIOUS_REPO_PATH=/path/to/repo
difflicious
```

## Docker Issues

### Container Won't Start

**Problem**: Docker container exits immediately after starting.

**Solution**:
```bash
# Check container logs
docker logs difflicious

# Check container status
docker ps -a

# Ensure git repository path is correct
docker run -v /correct/path/to/repo:/workspace insipid/difflicious:latest

# Verify Docker image exists
docker images insipid/difflicious
```

### Permission Denied

**Problem**: Permission denied errors when mounting volumes.

**Solution**:
```bash
# Check volume permissions
ls -la /path/to/repo

# Fix permissions if needed
chmod 755 /path/to/repo

# Or run with correct user mapping
docker run --user $(id -u):$(id -g) \
  -v /path/to/repo:/workspace \
  insipid/difflicious:latest
```

### Network Issues

**Problem**: Cannot access application in container.

**Solution**:
```bash
# Check port mapping
docker ps

# Verify port is correctly mapped
docker run -p 5000:5000 insipid/difflicious:latest

# Check firewall
sudo ufw status
```

### Image Pull Fails

**Problem**: Cannot pull Docker image.

**Solution**:
```bash
# Check internet connection
ping docker.io

# Try pulling specific tag
docker pull insipid/difflicious:0.9.0

# Or build from source
git clone https://github.com/insipid/difflicious.git
cd difflicious
docker build -t difflicious .
```

## Performance Issues

### Slow Page Loads

**Problem**: UI loads slowly or hangs.

**Solutions**:
```bash
# Check repository size
du -sh /path/to/repo

# Clear browser cache
# (Use browser's clear cache feature)

# Check system resources
top
df -h

# Increase Docker resources if in container
docker run --memory="2g" --cpus="2.0" insipid/difflicious:latest
```

### High Memory Usage

**Problem**: Application uses too much memory.

**Solutions**:
```bash
# Limit Docker memory
docker run --memory="512m" insipid/difflicious:latest

# Monitor memory usage
docker stats difflicious

# Check for memory leaks
# (Restart container periodically if needed)
```

## Git Issues

### Git Command Errors

**Problem**: Git operations fail with errors.

**Solutions**:
```bash
# Verify git is installed
git --version

# Ensure git is in PATH
which git

# Check repository is valid
cd /path/to/repo
git status

# Verify git permissions
ls -la .git
```

### Large Repository Performance

**Problem**: Application is slow on large repositories.

**Solutions**:
```bash
# Check repository size
git count-objects -vH

# Consider using .gitattributes to exclude large files
echo "*.zip filter=large binary" >> .gitattributes

# Limit diff context
# (Currently always full context, future feature)
```

### Stale Cache

**Problem**: Changes not showing up in UI.

**Solutions**:
```bash
# Refresh browser (Ctrl+F5 or Cmd+Shift+R)

# Restart application
# Ctrl+C to stop, then restart

# Clear browser cache if persistent
```

## Browser Issues

### JavaScript Errors

**Problem**: UI not working, console shows errors.

**Solutions**:
```bash
# Check browser console
# (Open Developer Tools with F12)

# Try different browser
# difflicious works in Chrome, Firefox, Safari, Edge

# Clear browser cache and cookies
# (Use browser's clear data feature)

# Try incognito/private mode
```

### CSS Not Loading

**Problem**: UI looks broken, no styling.

**Solutions**:
```bash
# Hard refresh browser
# Ctrl+F5 (Windows/Linux) or Cmd+Shift+R (Mac)

# Check network tab in DevTools
# Look for failed CSS requests

# Try different browser
# (May be browser-specific issue)
```

## Getting Help

If none of these solutions work:

1. Check the [DEPLOYMENT.md](DEPLOYMENT.md) guide
2. Review application logs:
   ```bash
   # Docker logs
   docker logs difflicious

   # Or console output if running directly
   ```
3. Open an issue on GitHub:
   - Include error messages
   - Describe reproduction steps
   - List your environment (OS, Python version, etc.)

## Common Error Messages

### "Connection refused"

**Cause**: Application not running or wrong port.

**Fix**: Check application is running and port is correct.

### "Permission denied"

**Cause**: Insufficient permissions to access git repository or files.

**Fix**: Check file permissions and user access.

### "Module not found"

**Cause**: Dependencies not installed or Python environment issues.

**Fix**: Reinstall dependencies with `pip install` or `uv sync`.

### "Address already in use"

**Cause**: Another process is using the port.

**Fix**: Use different port or stop conflicting process.

### "Not a git repository"

**Cause**: Not in a git repository or invalid path.

**Fix**: Navigate to git repository or set `DIFFLICIOUS_REPO_PATH`.

## Performance Tips

1. **Use Docker**: Consistent performance across environments
2. **Limit Resources**: Set appropriate Docker resource limits
3. **Monitor Logs**: Check logs for error patterns
4. **Regular Updates**: Keep image/package updated
5. **Network Optimization**: Use local deployment when possible

## Next Steps

- Review [DEPLOYMENT.md](DEPLOYMENT.md) for deployment options
- See [CONTRIBUTING.md](CONTRIBUTING.md) for development help
- Check the main [README.md](../README.md) for features
