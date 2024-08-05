'use client'
import React, { useRef, useEffect } from 'react';
import * as d3 from "d3";


const LogLogChart = ({ data }) => {
    const svgRef = useRef(null);
    const wrapperRef = useRef(null);
    const tooltipInterval = 3; // Adjust this variable to change the interval

    useEffect(() => {
      if (!svgRef.current || !wrapperRef.current) return;

      const margin = { top: 20, right: 30, bottom: 40, left: 50 };
      const aspectRatio = 16 / 9;
      const wrapper = d3.select(wrapperRef.current);
      const svg = d3.select(svgRef.current);

      const resizeChart = () => {
        const width = wrapper.node().clientWidth;
        const height = width / aspectRatio;

        svg
          .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
          .attr('preserveAspectRatio', 'xMinYMid meet');

        svg.selectAll("*").remove();

        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;

        // Define clip path
        svg.append("defs").append("clipPath")
          .attr("id", "clip")
          .append("rect")
          .attr("width", innerWidth)
          .attr("height", innerHeight)
          .attr("x", 0)
          .attr("y", 0);

        const g = svg.append('g')
          .attr('transform', `translate(${margin.left},${margin.top})`);

        const xScale = d3.scaleLog()
          .domain(d3.extent(data, d => d.date.getTime()))
          .range([0, innerWidth]);

        const yScale = d3.scaleLog()
          .domain(d3.extent(data, d => d.price))
          .range([innerHeight, 0]);

        const xAxis = d3.axisBottom(xScale)
          .ticks(10)
          .tickFormat(d3.timeFormat("%Y-%m-%d"));

        const yAxis = d3.axisLeft(yScale)
          .ticks(10, "~s");

        const addGridLines = () => {
          g.append('g')
            .attr('class', 'grid')
            .attr('transform', `translate(0, ${innerHeight})`)
            .call(
              d3.axisBottom(xScale)
                .ticks(10)
                .tickSize(-innerHeight)
                .tickFormat(() => '')
            )
            .selectAll('line')
            .attr('stroke', 'lightgrey')
            .attr('stroke-opacity', '0.7')
            .attr('shape-rendering', 'crispEdges');

          g.append('g')
            .attr('class', 'grid')
            .call(
              d3.axisLeft(yScale)
                .ticks(10)
                .tickSize(-innerWidth)
                .tickFormat(() => '')
            )
            .selectAll('line')
            .attr('stroke', 'lightgrey')
            .attr('stroke-opacity', '0.7')
            .attr('shape-rendering', 'crispEdges');
        };

        const addAxes = () => {
          g.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0, ${innerHeight})`)
            .call(xAxis);

          g.append('g')
            .attr('class', 'y-axis')
            .call(yAxis);
        };

        const drawLine = () => {
          const line = d3.line()
            .x(d => xScale(d.date.getTime()))
            .y(d => yScale(d.price))
            .curve(d3.curveMonotoneX); // Apply smoothing to the line

          g.append('path')
            .datum(data)
            .attr('fill', 'none')
            .attr('stroke', 'blue')
            .attr('stroke-width', 1.5)
            .attr('d', line);
        };

        const addTooltip = (trendLineData) => {
          const tooltip = g.append("g")
            .style("pointer-events", "none");

          const verticalLine = g.append("line")
            .attr("class", "vertical-line")
            .attr("stroke", "black")
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "4 2")
            .attr("y1", 0)
            .attr("y2", innerHeight)
            .style("visibility", "hidden");

          const horizontalLine = g.append("line")
            .attr("class", "horizontal-line")
            .attr("stroke", "black")
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "4 2")
            .attr("x1", 0)
            .attr("x2", innerWidth)
            .style("visibility", "hidden");

          const bisectDate = d3.bisector(d => d.date).left;
          let lastTooltipData = data[0];

          const updateTooltip = (event) => {
            const [x, y] = d3.pointer(event);
            
            // Check if the pointer is within the grid area
            if (x < margin.left || x > margin.left + innerWidth || y < margin.top || y > margin.top + innerHeight) {
              return;
            }

            const x0 = xScale.invert(x - margin.left); // adjust for margin
            const i = bisectDate(data, x0, 1);
            const d0 = data[i - 1];
            const d1 = data[i];

            let d = lastTooltipData;

            if (d0 && d1) {
              d = x0 - d0.date > d1.date - x0 ? d1 : d0;
              if (i % tooltipInterval === 0) {
                lastTooltipData = d;
              }
            }

            const nearestX = xScale(d.date.getTime());
            const nearestY = yScale(d.price);

            const trendLinePoint = trendLineData.find(td => td.date.getTime() === d.date.getTime());
            const trendLinePrice = trendLinePoint ? trendLinePoint.price : 0;

            const deviations = [
              { label: "+100%", value: trendLinePrice * 2, color: 'green' },
              { label: "+50%", value: trendLinePrice * 1.5, color: 'orange' },
              { label: "Price", value: Math.floor(d.price * 100)/100, color: "black" },
              { label: "Power Law", value: Math.floor(trendLinePrice * 100)/100, color: "red" },
              { label: "-25%", value: trendLinePrice * 0.75, color: 'purple' },
              { label: "-50%", value: trendLinePrice * 0.5, color: 'blue' },
            ];

            tooltip.style("visibility", "visible")
              .attr("transform", `translate(${nearestX},${nearestY})`);

            const path = tooltip.selectAll("path")
              .data([,])
              .join("path")
              .attr("fill", "white")
              .attr("stroke", "black");

            const text = tooltip.selectAll("text")
              .data([,])
              .join("text")
              .call(text => text
                .selectAll("tspan")
                .data([
                  `Date: ${d3.timeFormat("%Y-%m-%d")(new Date(d.date))}`,
                  ...deviations.map(dev => `${dev.label}: ${dev.value.toFixed(2)}`)
                ])
                .join("tspan")
                .attr("x", 0)
                .attr("y", (_, i) => `${i * 1.1}em`)
                .attr("font-weight", (_, i) => i === 0 || (i > 0 && deviations[i - 1].label) ? "bold" : null)
                .attr("fill", (_, i) => i > 0 ? deviations[i - 1].color : "black")
                .text(d => d));

            const { x: bboxX, y: bboxY, width: bboxWidth, height: bboxHeight } = text.node().getBBox();
            text.attr("transform", `translate(${-bboxWidth / 2},${15 - bboxY})`);
            path.attr("d", `M${-bboxWidth / 2 - 10},5H-5l5,-5l5,5H${bboxWidth / 2 + 10}v${bboxHeight + 20}h-${bboxWidth + 20}z`);

            verticalLine.style("visibility", "visible")
              .attr("x1", nearestX).attr("x2", nearestX);

            horizontalLine.style("visibility", "visible")
              .attr("y1", nearestY).attr("y2", nearestY);
          };

          svg.on("mousemove touchmove", updateTooltip)
            .on("pointerenter pointermove", updateTooltip)
            .on("mouseout touchend", () => {
              // Keep the lines and tooltip visible
            });

          // Move the tooltip to the end to ensure it is rendered last
          tooltip.raise();
        };

        const addTrendLine = () => {
          const logX = data.map(d => Math.log(d.date.getTime()));
          const logY = data.map(d => Math.log(d.price));
          const n = data.length;

          const sumLogX = d3.sum(logX);
          const sumLogY = d3.sum(logY);
          const sumLogXLogY = d3.sum(logX.map((d, i) => d * logY[i]));
          const sumLogX2 = d3.sum(logX.map(d => d * d));

          let slope = (n * sumLogXLogY - sumLogX * sumLogY) / (n * sumLogX2 - sumLogX * sumLogX);
          let intercept = (sumLogY - slope * sumLogX) / n;

          slope = Math.round(slope * 10000) / 10000;
          intercept = Math.round(intercept * 10000) / 10000;

          const trendLineData = data.map(d => {
            const logPrice = intercept + slope * Math.log(d.date.getTime());
            const price = Math.exp(logPrice);
            return { date: d.date, price };
          });

          const trendLine = d3.line()
            .x(d => xScale(d.date.getTime()))
            .y(d => yScale(d.price));

          g.append('path')
            .datum(trendLineData)
            .attr('clip-path', 'url(#clip)')  // Apply the clip path
            .attr('fill', 'none')
            .attr('stroke', 'red')
            .attr('stroke-width', 1.5)
            .attr('d', trendLine);

          const addDeviationLine = (deviation, color) => {
            const deviationLineData = trendLineData.map(d => ({
              date: d.date,
              price: d.price * deviation
            }));

            g.append('path')
              .datum(deviationLineData)
              .attr('clip-path', 'url(#clip)')  // Apply the clip path
              .attr('fill', 'none')
              .attr('stroke', color)
              .attr('stroke-width', 1.5)
              .attr('stroke-dasharray', '5,5')
              .attr('d', trendLine);
          };

          addDeviationLine(2, 'green'); // +100%
          addDeviationLine(1.5, 'orange'); // +50%
          addDeviationLine(0.75, 'purple'); // -25%
          addDeviationLine(0.5, 'blue'); // -50%

          // Add tooltip after calculating trendline and deviations
          addTooltip(trendLineData);
        };

        addGridLines();
        addAxes();
        drawLine(); // Replace points with a line
        addTrendLine();
      };

      resizeChart();
      window.addEventListener('resize', resizeChart);

      return () => window.removeEventListener('resize', resizeChart);
    }, [data]);

    return( 
        <div ref={wrapperRef} className="w-full">
            <svg ref={svgRef} />
        </div>
    );
};

export default LogLogChart;